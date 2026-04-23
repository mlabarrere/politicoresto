#!/usr/bin/env Rscript
# INSEE CALMAR-style 4-dimensional calibration fixture.
#
# What this IS:
#   A French-demographic flavoured calibration case across age × sex ×
#   region × CSP, solved with R's survey::calibrate using linear /
#   truncated linear — the same family of methods INSEE's CALMAR uses.
#   The fixture exercises the multi-dimensional behaviour our wrapper
#   will see in production (PoliticoResto poll respondents calibrated
#   on INSEE RP marginals).
#
# What this is NOT:
#   A bit-for-bit reproduction of a numerical example published in the
#   CALMAR 2 user manual (Sautory, INSEE). Reproducing the manual's
#   exact published weights requires access to its PDF and is tracked
#   as a future enhancement. This file is already a strong regression
#   net: any drift in the 4-dim case above the 1e-6 gate fails CI.
#
# Rerun with:
#   Rscript worker/tests/external_benchmark/scripts/generate_insee_calmar.R

suppressPackageStartupMessages(library(survey))
set.seed(4242)

args <- commandArgs(trailingOnly = FALSE)
script_arg  <- args[grep("^--file=", args)]
script_path <- if (length(script_arg) > 0) sub("^--file=", "", script_arg[1]) else "."
script_dir  <- normalizePath(dirname(script_path), mustWork = FALSE)
out_dir <- file.path(script_dir, "..", "data")

# ── Population marginals (approximate 2022 INSEE metropolitan France) ──
# Not load-bearing for the parity test — any consistent set works.
target_shares <- list(
  age    = c(a18_34 = 0.25, a35_64 = 0.50, a65p = 0.25),
  sex    = c(F = 0.52, M = 0.48),
  region = c(ile_de_france = 0.18, nord = 0.15, sud_est = 0.20,
             ouest = 0.18, est = 0.14, sud_ouest = 0.15),
  csp    = c(employes = 0.30, intermediaires = 0.20,
             cadres = 0.20, retraites = 0.20, ouvriers = 0.10)
)

n <- 1200
df <- data.frame(
  age    = sample(names(target_shares$age),    n, replace = TRUE,
                  prob = c(0.30, 0.55, 0.15)),      # sample over-represents working-age
  sex    = sample(names(target_shares$sex),    n, replace = TRUE,
                  prob = c(0.60, 0.40)),            # sample over-represents F
  region = sample(names(target_shares$region), n, replace = TRUE,
                  prob = c(0.30, 0.10, 0.20, 0.15, 0.10, 0.15)),
  csp    = sample(names(target_shares$csp),    n, replace = TRUE,
                  prob = c(0.40, 0.25, 0.20, 0.10, 0.05)),
  stringsAsFactors = FALSE
)

# Factor levels = alphabetical (R's contrast default).
df$age    <- factor(df$age,    levels = sort(names(target_shares$age)))
df$sex    <- factor(df$sex,    levels = sort(names(target_shares$sex)))
df$region <- factor(df$region, levels = sort(names(target_shares$region)))
df$csp    <- factor(df$csp,    levels = sort(names(target_shares$csp)))

# Build the R population-totals vector. R drops the first level of each
# factor (alphabetical); we supply targets for the remaining levels.
build_totals <- function(shares, factor_name) {
  lvls <- sort(names(shares))
  ref <- lvls[1]
  non_ref <- setdiff(lvls, ref)
  setNames(n * shares[non_ref], paste0(factor_name, non_ref))
}
pop_totals <- c(
  `(Intercept)` = n,
  build_totals(target_shares$age,    "age"),
  build_totals(target_shares$sex,    "sex"),
  build_totals(target_shares$region, "region"),
  build_totals(target_shares$csp,    "csp")
)

ds <- svydesign(ids = ~1, weights = ~I(rep(1, n)), data = df)
cal <- calibrate(ds, ~age + sex + region + csp,
                 population = pop_totals,
                 bounds = c(0.25, 4), calfun = "linear")
w <- weights(cal)
stopifnot(length(w) == n, all(is.finite(w)))
stopifnot(all(w >= 0.25 - 1e-9), all(w <= 4 + 1e-9))

out <- data.frame(df, r_weight = as.numeric(w), stringsAsFactors = FALSE)
write.csv(out, file.path(out_dir, "insee_calmar_style_4d.csv"), row.names = FALSE)

cat(sprintf("wrote insee_calmar_style_4d.csv\n"))
cat(sprintf("  n=%d  sum=%.3f  range=[%.4f, %.4f]\n",
            n, sum(w), min(w), max(w)))

# ── Achieved marginals sanity check — should match targets to eps. ──
for (f_name in c("age", "sex", "region", "csp")) {
  achieved <- tapply(w, df[[f_name]], sum) / sum(w)
  cat(sprintf("  %s achieved:\n", f_name))
  for (nm in names(achieved)) {
    cat(sprintf("    %-20s achieved=%.4f  target=%.4f\n",
                nm, achieved[nm], target_shares[[f_name]][nm]))
  }
}
