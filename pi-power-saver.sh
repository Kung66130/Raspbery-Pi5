#!/bin/bash
# Pi Power Saver - Manage services based on SSH sessions

# เพิ่ม wa-agent และ pi-status-update เข้าไปในรายการ
SERVICES="bt-agent wa-agent pi-status-update"
SESSION_COUNT=$(who | grep -c "pts")

if [ "$PAM_TYPE" = "open_session" ]; then
    # Start services when user logs in
    for svc in $SERVICES; do
        sudo systemctl start $svc 2>/dev/null
    done
elif [ "$PAM_TYPE" = "close_session" ]; then
    # Stop services when last user logs out
    if [ $SESSION_COUNT -le 1 ]; then
        for svc in $SERVICES; do
            sudo systemctl stop $svc 2>/dev/null
        done
    fi
fi
