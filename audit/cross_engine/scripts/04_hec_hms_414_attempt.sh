#!/usr/bin/env bash
# Attempt to obtain HEC-HMS 4.14 for Linux from the official HEC site.
# Result on 2026-10-11 in this sandbox: egress proxy refused the CONNECT (HTTP 403, policy denial).
set -u
for u in https://www.hec.usace.army.mil/software/hec-hms/downloads.aspx https://www.hec.usace.army.mil/ https://hec.usace.army.mil/; do
  curl -sS -o /dev/null -w "$u -> HTTP %{http_code}\n" "$u" 2>&1
done
