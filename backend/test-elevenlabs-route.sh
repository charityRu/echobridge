#!/usr/bin/env bash
curl -i -X POST "http://localhost:5000/api/elevenlabs/isolate" -F "voiceRecord=@C:/Users/Noluthando/echobridge/backend/test-audio.webm;type=audio/webm"