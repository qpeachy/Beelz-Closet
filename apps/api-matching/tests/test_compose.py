from api_matching.compose import Candidate, Context, compose, score_item


def _item(
    item_id: str,
    category: str,
    *,
    required: bool,
    slot_type: str = "single",
    situation: str | None = None,
    mood: str | None = None,
    weather: str | None = None,
    temperature: float | None = None,
) -> Candidate:
    return Candidate(
        item_id,
        f"/files/{item_id}.jpg",
        category,
        slot_type,
        required,
        temperature,
        situation,
        mood,
        weather,
    )


def test_exact_situation_beats_a_mismatch() -> None:
    context = Context("travail", "en forme", None, None)
    match = _item("a", "haut", required=True, situation="travail", mood="en forme")
    other = _item("b", "haut", required=True, situation="sport", mood="fatiguée")
    assert score_item(match, context) > score_item(other, context)


def test_temperature_distance_lowers_the_score() -> None:
    context = Context("travail", "en forme", "pluie", 10)
    close = _item(
        "a",
        "haut",
        required=True,
        situation="travail",
        mood="en forme",
        weather="pluie",
        temperature=10,
    )
    far = _item(
        "b",
        "haut",
        required=True,
        situation="travail",
        mood="en forme",
        weather="pluie",
        temperature=30,
    )
    assert score_item(close, context) == 1
    assert score_item(far, context) < score_item(close, context)


def test_multi_accessories_follow_the_threshold() -> None:
    context = Context("travail", "en forme", None, None)
    items = [
        _item("haut", "haut", required=True, situation="travail", mood="en forme"),
        _item("bas", "bas", required=True, situation="travail", mood="en forme"),
        _item("shoes", "chaussures", required=True, situation="travail", mood="en forme"),
        _item(
            "glasses",
            "accessoire",
            required=False,
            slot_type="multi",
            situation="travail",
            mood="en forme",
        ),
        _item(
            "umbrella",
            "accessoire",
            required=False,
            slot_type="multi",
            situation="travail",
            mood="en forme",
        ),
        _item("scarf", "accessoire", required=False, slot_type="multi", situation="sport"),
    ]
    outfits, missing = compose(items, context, ["haut", "bas", "chaussures"])
    assert missing == []
    categories = [scored.item.id for scored in outfits[0]]
    assert "glasses" in categories
    assert "umbrella" in categories
    assert "scarf" not in categories


def test_missing_required_category_does_not_invent_a_slot() -> None:
    context = Context("travail", "en forme", None, None)
    items = [
        _item("bas", "bas", required=True, situation="travail", mood="en forme"),
        _item("shoes", "chaussures", required=True, situation="travail", mood="en forme"),
    ]
    outfits, missing = compose(items, context, ["haut", "bas", "chaussures"])
    assert outfits == []
    assert missing == ["haut"]


def test_second_outfit_swaps_the_next_required_item() -> None:
    context = Context("travail", "en forme", None, None)
    items = [
        _item("haut-a", "haut", required=True, situation="travail", mood="en forme"),
        _item("haut-b", "haut", required=True, situation="sport", mood="fatiguée"),
        _item("bas", "bas", required=True, situation="travail", mood="en forme"),
        _item("shoes", "chaussures", required=True, situation="travail", mood="en forme"),
    ]
    outfits, missing = compose(items, context, ["bas", "chaussures", "haut"])
    assert missing == []
    assert len(outfits) == 2
    assert outfits[0][0].item.id == "haut-a"
    assert outfits[1][0].item.id == "haut-b"
