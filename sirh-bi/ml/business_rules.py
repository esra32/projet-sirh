"""
Shared business rules for the SIRH BI/ML scripts.

These helpers keep the ML layer coherent even when the data warehouse has not
yet been rebuilt after a source-data correction.
"""

from __future__ import annotations

import pandas as pd


CONTRACT_SENIORITY_LIMITS = {
    "STAGE": 6,
    "ALTERNANCE": 24,
    "CDD": 30,
}

CONTRACT_PRECARITY_SCORE = {
    "CDI": 1,
    "FREELANCE": 2,
    "CDD": 3,
    "ALTERNANCE": 4,
    "STAGE": 5,
}


def normalize_contract(contract: object, seniority_months: object) -> str:
    contract_value = str(contract or "CDI").strip().upper()
    if contract_value in {"", "NONE", "NAN", "NULL"}:
        contract_value = "CDI"

    try:
        seniority = float(seniority_months)
    except (TypeError, ValueError):
        seniority = 0.0

    limit = CONTRACT_SENIORITY_LIMITS.get(contract_value)
    if limit is not None and seniority > limit:
        return "CDI"

    return contract_value


def apply_contract_coherence(
    df: pd.DataFrame,
    contract_col: str = "type_contrat",
    seniority_col: str = "anciennete_mois",
    output_col: str = "type_contrat_ml",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return a copy with an ML-safe contract column and a correction summary."""
    out = df.copy()
    original = out[contract_col].fillna("CDI").astype(str).str.strip().str.upper()
    out[contract_col] = original
    out[output_col] = [
        normalize_contract(contract, seniority)
        for contract, seniority in zip(original, out[seniority_col])
    ]

    mask = out[contract_col] != out[output_col]
    if not mask.any():
        summary = pd.DataFrame(columns=["type_contrat_initial", "type_contrat_ml", "nb", "anciennete_moy"])
    else:
        summary = (
            out.loc[mask]
            .groupby([contract_col, output_col])
            .agg(
                nb=(output_col, "count"),
                anciennete_moy=(seniority_col, "mean"),
            )
            .round({"anciennete_moy": 1})
            .reset_index()
            .rename(columns={contract_col: "type_contrat_initial"})
        )

    return out, summary


def print_contract_coherence_report(summary: pd.DataFrame) -> None:
    pass


def contract_precarity(contract: object) -> int:
    contract_value = str(contract or "CDI").strip().upper()
    return CONTRACT_PRECARITY_SCORE.get(contract_value, 3)
