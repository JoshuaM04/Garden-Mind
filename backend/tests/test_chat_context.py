import importlib

import pytest
from pydantic import ValidationError


@pytest.fixture
def chat_module(monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "test-token")
    return importlib.import_module("backend.app.services.chat")


def plant_context(nickname="Desk basil"):
    return {
        "nickname": nickname,
        "species": "Ocimum basilicum",
        "location": "indoor",
        "sun_exposure": "bright_indirect",
        "planted_on": "2026-06-01",
    }


def test_chat_context_is_limited_to_twenty_plants(chat_module):
    with pytest.raises(ValidationError):
        chat_module.ChatRequest(
            message="How should I care for these?",
            history=[],
            plants=[
                plant_context(f"Plant {index}")
                for index in range(21)
            ],
        )


def test_chat_context_rejects_unexpected_private_fields(chat_module):
    context = plant_context()
    context["notes"] = "Private notes"

    with pytest.raises(ValidationError):
        chat_module.ChatRequest(
            message="How should I care for this?",
            history=[],
            plants=[context],
        )


def test_build_messages_adds_plant_data_as_untrusted_context(chat_module):
    request = chat_module.ChatRequest(
        message="How often should I water my basil?",
        history=[],
        plants=[plant_context()],
    )

    messages = chat_module.build_messages(request)

    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "untrusted data" in messages[0]["content"]
    assert "<plant_collection>" in messages[0]["content"]
    assert '"nickname": "Desk basil"' in messages[0]["content"]
    assert messages[-1] == {
        "role": "user",
        "content": "How often should I water my basil?",
    }


def test_build_messages_omits_plant_context_when_not_signed_in(chat_module):
    request = chat_module.ChatRequest(
        message="How often should I water basil?",
        history=[],
    )

    messages = chat_module.build_messages(request)

    assert len(messages) == 2
    assert messages[-1]["content"] == "How often should I water basil?"
