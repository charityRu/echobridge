#!/usr/bin/env bash
curl -i -X POST "http://localhost:5000/api/lalalai/clean?lalalai_test=1" -F "voiceRecord=@C:/Users/Noluthando/echobridge/backend/test-audio.webm;type=audio/webm"