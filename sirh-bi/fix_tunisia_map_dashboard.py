import json

from superset.app import create_app


DASHBOARD_ID = 6
OLD_CHART_ID = 126
OLD_COMPONENT_ID = "CHART-explore-126-geo"
ROW_ID = "ROW-geo-tunisie"
MARKDOWN_ID = "MARKDOWN-geo-tunisie"


def remove_chart_from_metadata(metadata: dict, chart_id: int) -> dict:
    chart_key = str(chart_id)
    chart_configuration = metadata.get("chart_configuration", {})
    chart_configuration.pop(chart_key, None)

    for config in chart_configuration.values():
        cross_filters = config.get("crossFilters", {})
        charts = cross_filters.get("chartsInScope")
        if isinstance(charts, list):
            cross_filters["chartsInScope"] = [chart for chart in charts if chart != chart_id]

    global_config = metadata.get("global_chart_configuration", {})
    charts = global_config.get("chartsInScope")
    if isinstance(charts, list):
        global_config["chartsInScope"] = [chart for chart in charts if chart != chart_id]

    for native_filter in metadata.get("native_filter_configuration", []):
        charts = native_filter.get("chartsInScope")
        if isinstance(charts, list):
            native_filter["chartsInScope"] = [chart for chart in charts if chart != chart_id]

    return metadata


def main() -> None:
    app = create_app()
    with app.app_context():
        from superset import db
        from superset.models.dashboard import Dashboard
        from superset.models.slice import Slice

        dashboard = db.session.get(Dashboard, DASHBOARD_ID)
        if dashboard is None:
            raise RuntimeError(f"Dashboard {DASHBOARD_ID} not found")

        position = json.loads(dashboard.position_json)
        row = position.get(ROW_ID)
        if row is None:
            raise RuntimeError(f"Layout row {ROW_ID} not found")

        position.pop(OLD_COMPONENT_ID, None)
        row["children"] = [MARKDOWN_ID]
        position[ROW_ID] = row
        position[MARKDOWN_ID] = {
            "children": [],
            "id": MARKDOWN_ID,
            "meta": {
                "code": (
                    '<div style="width:100%;height:100%;min-height:390px;'
                    'display:flex;align-items:center;justify-content:center;">'
                    '<img src="/static/assets/tunisia_recruitment_map.svg" '
                    'alt="Carte Tunisie - recrutements par ville" '
                    'style="width:100%;height:100%;max-height:410px;object-fit:contain;" />'
                    "</div>"
                ),
                "height": 58,
                "width": 12,
            },
            "parents": ["ROOT_ID", "GRID_ID", ROW_ID],
            "type": "MARKDOWN",
        }
        dashboard.position_json = json.dumps(position, ensure_ascii=False)

        metadata = json.loads(dashboard.json_metadata or "{}")
        dashboard.json_metadata = json.dumps(
            remove_chart_from_metadata(metadata, OLD_CHART_ID), ensure_ascii=False
        )

        old_chart = db.session.get(Slice, OLD_CHART_ID)
        if old_chart is not None and old_chart in dashboard.slices:
            dashboard.slices.remove(old_chart)

        db.session.commit()
        print("Tunisia local map component installed on dashboard 6.")


if __name__ == "__main__":
    main()
