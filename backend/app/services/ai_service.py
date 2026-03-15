"""
AIService — natural language slot search.

Converts freeform user queries like "something Thursday afternoon" into
structured filters that SlotService can execute. Intentionally narrow scope:
the AI is only used for parsing intent, never for booking or writing data.
"""
import json
from datetime import datetime, timezone
from typing import Optional

from flask import current_app


class AIService:

    @staticmethod
    def parse_slot_search_intent(query: str, available_slots: list) -> dict:
        """
        Parse a natural language query into structured slot filters.

        Returns:
            {
                "filtered_slot_ids": [...],
                "explanation": "..."
            }
        """
        api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            return {"filtered_slot_ids": None, "explanation": "AI search not configured."}

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)

            now = datetime.now(timezone.utc).isoformat()
            slots_summary = [
                {
                    "id": s.id,
                    "start": s.start_time.isoformat(),
                    "end": s.end_time.isoformat(),
                    "provider": s.provider.service_name if s.provider else "",
                }
                for s in available_slots
            ]

            prompt = f"""
You are a scheduling assistant. The current UTC time is {now}.
The user is searching for an available appointment slot.

User query: "{query}"

Available slots (JSON):
{json.dumps(slots_summary, indent=2)}

Return ONLY a valid JSON object (no markdown, no extra text) with:
{{
  "filtered_slot_ids": [<list of matching slot IDs as integers>],
  "explanation": "<brief natural-language explanation of what matched and why>"
}}

Match slots that fit the user's time preference. If the query mentions
"morning" match 06:00–12:00, "afternoon" match 12:00–17:00, "evening"
match 17:00–21:00. Day names like "Thursday" match that weekday.
If nothing matches, return an empty list.
""".strip()

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )

            raw = response.content[0].text.strip()
            # Strip any accidental markdown fences
            raw = raw.replace("```json", "").replace("```", "").strip()
            result = json.loads(raw)
            return result

        except Exception as exc:
            current_app.logger.error(f"AIService error: {exc}")
            return {
                "filtered_slot_ids": None,
                "explanation": f"AI search unavailable: {str(exc)}",
            }
