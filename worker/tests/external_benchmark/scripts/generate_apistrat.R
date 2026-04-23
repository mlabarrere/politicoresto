#!/usr/bin/env Rscript
# Produce frozen R-survey reference outputs for our benchmark tests.
#
# Two fixtures:
#   1. apistrat_linear.csv    — linear calibration with LOOSE bounds [0.1, 10]
#                                so bounds never bite; the pure linear-math
#                                parity between samplics and R survey::calibrate
#                                is what's under test.
#   2. balanced_tight.csv     — a synthetic 500-row sample close to targets,
#                                bounds [0.5, 2.0] never bind on either side.
#
# Rerun with:
#   Rscript worker/tests/external_benchmark/scripts/generate_apistrat.R

suppressPackageStartupMessages(library(survey))
data(api)

out_dir <- {
  args <- commandArgs(trailingOnly = FALSE)
  script_arg  <- args[grep("^--file=", args)]
  script_path <- if (length(script_arg) > 0) sub("^--file=", "", script_arg[1]) else "."
  file.path(normalizePath(dirname(script_path), mustWork = FALSE), "..", "data")
}

# ─────────────────────────────────────────────────────────────
# Fixture 1 — apistrat, loose bounds, tests linear math parity.
# ─────────────────────────────────────────────────────────────
n1 <- nrow(apistrat)  # 200
pop_total <- 6194
pop_totals_1 <- c(
  `(Intercept)` = n1,
  stypeH    = n1 * 755  / pop_total,
  stypeM    = n1 * 1018 / pop_total,
  awardsYes = n1 * 3194 / pop_total
)
ds1 <- svydesign(ids = ~1, weights = ~I(rep(1, n1)), data = apistrat)
cal1 <- calibrate(ds1, ~stype + awards, population = pop_totals_1,
                  bounds = c(0.1, 10), calfun = "linear")
w1 <- weights(cal1)
stopifnot(length(w1) == n1, all(is.finite(w1)))
write.csv(
  data.frame(stype = as.character(apistrat$stype),
             awards = as.character(apistrat$awards),
             r_weight = as.numeric(w1)),
  file.path(out_dir, "apistrat_linear.csv"),
  row.names = FALSE
)
cat("apistrat_linear.csv     — n=", n1, "sum=", round(sum(w1),3),
    "range=[", round(min(w1),3), ",", round(max(w1),3), "]\n")

# ─────────────────────────────────────────────────────────────
# Fixture 2 — synthetic balanced sample, tight bounds [0.5, 2].
# ─────────────────────────────────────────────────────────────
set.seed(12345)
n2 <- 500
sex <- rep(c("F", "M"), c(260, 240))            # ~52/48 as target
age <- sample(c("young", "old"), n2, replace = TRUE, prob = c(0.45, 0.55))
syn <- data.frame(
  sex = factor(sex, levels = c("F", "M")),      # F reference
  age = factor(age, levels = c("old", "young")) # old reference
)
pop_totals_2 <- c(
  `(Intercept)` = n2,
  sexM    = n2 * 0.48,
  ageyoung = n2 * 0.40
)
ds2 <- svydesign(ids = ~1, weights = ~I(rep(1, n2)), data = syn)
cal2 <- calibrate(ds2, ~sex + age, population = pop_totals_2,
                  bounds = c(0.5, 2), calfun = "linear")
w2 <- weights(cal2)
stopifnot(length(w2) == n2, all(is.finite(w2)),
          all(w2 >= 0.5 - 1e-9), all(w2 <= 2 + 1e-9))
write.csv(
  data.frame(sex = as.character(syn$sex),
             age = as.character(syn$age),
             r_weight = as.numeric(w2)),
  file.path(out_dir, "balanced_tight.csv"),
  row.names = FALSE
)
cat("balanced_tight.csv      — n=", n2, "sum=", round(sum(w2),3),
    "range=[", round(min(w2),3), ",", round(max(w2),3), "]\n")
