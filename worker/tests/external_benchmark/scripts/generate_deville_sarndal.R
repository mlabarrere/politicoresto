#!/usr/bin/env Rscript
# Deville-Särndal (1992) §5 didactic case, reproduced through
# survey::calibrate so the expected output carries R's authority.
#
# The paper's §5 example is a tiny n=20 illustrative dataset with two
# auxiliary variables. Since the paper does not publish machine-
# readable fixtures, we recreate a case faithful to its STRUCTURE
# (small n, two binary auxiliaries, heavy reweighting required) and
# use R as the "oracle" for what Deville-Särndal linear calibration
# should produce.
#
# Rerun with:
#   Rscript worker/tests/external_benchmark/scripts/generate_deville_sarndal.R

suppressPackageStartupMessages(library(survey))

# Small hand-designed sample: 20 respondents, two binary features,
# skewed so linear calibration has real work to do but no clipping.
df <- data.frame(
  urban = factor(c(rep("yes", 14), rep("no", 6)), levels = c("no", "yes")),
  edu   = factor(c(rep("high", 12), rep("low", 8)), levels = c("high", "low"))
)
n <- nrow(df)
pop_urban_yes <- 0.60
pop_edu_low   <- 0.55
pop_totals <- c(
  `(Intercept)` = n,
  urbanyes = n * pop_urban_yes,
  edulow   = n * pop_edu_low
)
ds <- svydesign(ids = ~1, weights = ~I(rep(1, n)), data = df)
cal <- calibrate(ds, ~urban + edu, population = pop_totals,
                 bounds = c(0.1, 10), calfun = "linear")
w <- weights(cal)
stopifnot(length(w) == n, all(is.finite(w)))

out_dir <- {
  args <- commandArgs(trailingOnly = FALSE)
  script_arg  <- args[grep("^--file=", args)]
  script_path <- if (length(script_arg) > 0) sub("^--file=", "", script_arg[1]) else "."
  file.path(normalizePath(dirname(script_path), mustWork = FALSE), "..", "data")
}
write.csv(
  data.frame(urban = as.character(df$urban),
             edu   = as.character(df$edu),
             r_weight = as.numeric(w)),
  file.path(out_dir, "deville_sarndal_toy.csv"),
  row.names = FALSE
)
cat("deville_sarndal_toy.csv — n=", n, "sum=", round(sum(w), 6),
    "range=[", round(min(w), 4), ",", round(max(w), 4), "]\n")
