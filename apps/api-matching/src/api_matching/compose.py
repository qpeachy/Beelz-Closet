from dataclasses import dataclass

WEIGHT_SITUATION = 0.3
WEIGHT_MOOD = 0.3
WEIGHT_WEATHER = 0.4
TEMPERATURE_SPAN_C = 20.0
OPTIONAL_THRESHOLD = 0.5
REQUIRED_ORDER = ("haut", "bas", "chaussures")
MAX_OUTFITS = 3


@dataclass(frozen=True)
class Context:
    situation: str
    mood: str
    weather: str | None
    temperature: float | None


@dataclass(frozen=True)
class Candidate:
    id: str
    url: str
    category: str
    slot_type: str
    required: bool
    temperature: float | None
    situation: str | None
    mood: str | None
    weather: str | None


@dataclass(frozen=True)
class Scored:
    item: Candidate
    score: float


def score_item(item: Candidate, context: Context) -> float:
    weighted = WEIGHT_SITUATION * (1.0 if item.situation == context.situation else 0.0)
    weighted += WEIGHT_MOOD * (1.0 if item.mood == context.mood else 0.0)
    total = WEIGHT_SITUATION + WEIGHT_MOOD
    weather_parts = 0
    weather_score = 0.0
    if context.weather is not None:
        weather_parts += 1
        weather_score += 1.0 if item.weather == context.weather else 0.0
    if context.temperature is not None:
        weather_parts += 1
        if item.temperature is not None:
            delta = abs(item.temperature - context.temperature)
            weather_score += max(0.0, 1.0 - delta / TEMPERATURE_SPAN_C)
    if weather_parts:
        total += WEIGHT_WEATHER
        weighted += WEIGHT_WEATHER * (weather_score / weather_parts)
    return weighted / total


def order_required(names: list[str]) -> list[str]:
    head = [name for name in REQUIRED_ORDER if name in names]
    tail = sorted(name for name in names if name not in REQUIRED_ORDER)
    return head + tail


def compose(
    items: list[Candidate],
    context: Context,
    required_names: list[str],
) -> tuple[list[list[Scored]], list[str]]:
    by_category: dict[str, list[Scored]] = {}
    for item in items:
        by_category.setdefault(item.category, []).append(
            Scored(item, score_item(item, context))
        )
    for group in by_category.values():
        group.sort(key=lambda scored: (-scored.score, scored.item.id))

    ordered = order_required(required_names)
    missing = [name for name in ordered if not by_category.get(name)]
    if missing:
        return [], missing

    optional_names = sorted(
        name
        for name, group in by_category.items()
        if group and not group[0].item.required
    )

    def pick(offsets: dict[str, int]) -> list[Scored]:
        chosen: list[Scored] = []
        for name in ordered:
            group = by_category[name]
            index = min(offsets.get(name, 0), len(group) - 1)
            chosen.append(group[index])
        for name in optional_names:
            group = by_category[name]
            if group[0].item.slot_type == "multi":
                chosen.extend(scored for scored in group if scored.score >= OPTIONAL_THRESHOLD)
            elif group[0].score >= OPTIONAL_THRESHOLD:
                chosen.append(group[0])
        return chosen

    outfits = [pick({})]
    for name in ordered:
        if len(outfits) >= MAX_OUTFITS or len(by_category[name]) < 2:
            continue
        alternative = pick({name: 1})
        primary_ids = [scored.item.id for scored in outfits[0]]
        if [scored.item.id for scored in alternative] != primary_ids:
            outfits.append(alternative)
    return outfits, []
