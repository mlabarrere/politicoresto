# PoliticoResto weighting worker — local developer gate.
#
# Usage:
#   make install   — install dev + runtime deps via uv.
#   make verify    — single pre-push gate (lint + typecheck + all test layers).
#   make test      — run pytest across all five layers.
#   make unit      — unit layer only (fast).
#   make clean     — drop caches and the virtualenv.

.PHONY: install verify test unit property differential golden external lint fmt typecheck clean

install:
	uv sync

lint:
	.venv/bin/ruff check src/ tests/

fmt:
	.venv/bin/ruff format src/ tests/

typecheck:
	.venv/bin/mypy src/

test:
	.venv/bin/python -m pytest

unit:
	.venv/bin/python -m pytest tests/unit

property:
	.venv/bin/python -m pytest -m property

differential:
	.venv/bin/python -m pytest -m differential

golden:
	.venv/bin/python -m pytest -m golden

external:
	.venv/bin/python -m pytest -m external_benchmark

verify: lint typecheck test
	@echo ""
	@echo "[verify] all layers green."

clean:
	rm -rf .venv .pytest_cache .mypy_cache .ruff_cache .hypothesis
