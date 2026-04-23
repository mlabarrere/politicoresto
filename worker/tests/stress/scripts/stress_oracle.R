#!/usr/bin/env Rscript
# Stress-test oracle — reads a JSON scenario from stdin, runs
# `survey::calibrate` with the same constraint system the Python
# wrapper solves, and writes {r_weights, r_weighted_shares, converged}
# back as JSON on stdout.
#
# Invoked by tests/stress/r_oracle.py. Failures on the R side (infeasible
# system, non-convergence, singular matrix) are caught and returned as
# {ok: false, reason: "..."} so Python can skip the scenario cleanly
# instead of crashing.
#
# JSON request schema:
#   {
#     "scenario_id": "stress-042",
#     "respondents": [ {"age_bucket": "25_34", "sex": "F", ...,
#                       "poll_answer": "opt_a"}, ... ],
#     "marginals": { "age_bucket": {"18_24": 0.2, ...}, ... },
#     "bounds": [0.5, 2.0],
#     "poll_options": ["opt_a", "opt_b", ...]
#   }
#
# JSON response schema on success:
#   {
#     "ok": true,
#     "r_weights": [ ... ],
#     "r_weighted_shares": { "opt_a": 0.40, "opt_b": 0.60 },
#     "converged": true,
#     "n_iterations": <int>
#   }
# On failure:
#   { "ok": false, "reason": "..." }

suppressPackageStartupMessages({
  library(survey)
  library(jsonlite)
})

emit_failure <- function(reason) {
  cat(toJSON(list(ok = FALSE, reason = as.character(reason)),
             auto_unbox = TRUE))
  quit(save = "no", status = 0)
}

req <- tryCatch(
  fromJSON(file("stdin"), simplifyDataFrame = FALSE),
  error = function(e) emit_failure(sprintf("stdin parse failed: %s", conditionMessage(e)))
)

bounds        <- as.numeric(req$bounds)
marginals     <- req$marginals
respondents   <- req$respondents
poll_options  <- unlist(req$poll_options)

if (length(respondents) == 0) emit_failure("empty respondents")

# ──────────────────────────────────────────────────────────────────────
# Build a data.frame from the list-of-dicts. The Python side sends one
# dict per respondent, keys being the active dimensions + 'poll_answer'.
# ──────────────────────────────────────────────────────────────────────
dim_names <- names(marginals)                    # active calibration dims
col_names <- c(dim_names, "poll_answer")
df_cols <- lapply(col_names, function(cn) {
  vapply(respondents, function(r) as.character(r[[cn]]), character(1))
})
names(df_cols) <- col_names
df <- as.data.frame(df_cols, stringsAsFactors = FALSE)
n  <- nrow(df)

# Factor levels ordered alphabetically → R drops the first level (its
# reference). Python's marginal dict puts the alpha-first category
# LAST (see generator.py). So R's reference == Python's dropped
# reference == same constrained system.
for (dim in dim_names) {
  categories  <- names(marginals[[dim]])
  sorted_cats <- sort(categories)
  df[[dim]] <- factor(as.character(df[[dim]]), levels = sorted_cats)
}

# Build the R population-totals vector. Reference = alpha-first per dim.
build_totals <- function(shares_list, factor_name, n) {
  lvls <- sort(names(shares_list))
  ref  <- lvls[1]
  non_ref <- setdiff(lvls, ref)
  out <- setNames(
    vapply(non_ref, function(c) n * as.numeric(shares_list[[c]]), numeric(1)),
    paste0(factor_name, non_ref)
  )
  out
}
pop_totals <- c(`(Intercept)` = n)
for (dim in dim_names) {
  pop_totals <- c(pop_totals, build_totals(marginals[[dim]], dim, n))
}

formula_rhs <- paste(dim_names, collapse = " + ")
r_formula <- stats::as.formula(paste("~", formula_rhs))

ds <- svydesign(ids = ~1, weights = ~I(rep(1, n)), data = df)

cal <- tryCatch(
  suppressWarnings(
    calibrate(ds, r_formula, population = pop_totals,
              bounds = bounds, calfun = "linear")
  ),
  error = function(e) NULL,
  warning = function(w) NULL
)

if (is.null(cal)) emit_failure("calibrate failed or did not converge")

w <- as.numeric(weights(cal))
if (any(!is.finite(w))) emit_failure("non-finite weights")
if (any(w < bounds[1] - 1e-9) || any(w > bounds[2] + 1e-9)) {
  emit_failure("weights outside bounds — bug on R side")
}

# Weighted poll shares per option. Matches what our estimation.py
# will produce in production.
poll_answer <- as.character(df$poll_answer)
weighted_shares <- vapply(
  poll_options,
  function(opt) sum(w[poll_answer == opt]) / sum(w),
  numeric(1)
)

response <- list(
  ok = TRUE,
  r_weights = w,
  r_weighted_shares = as.list(weighted_shares),
  converged = TRUE,
  n_iterations = NA_integer_
)
cat(toJSON(response, auto_unbox = TRUE, digits = NA))
