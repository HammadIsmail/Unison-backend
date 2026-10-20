#!/bin/bash

ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0xMjMiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzczNDg2MTQyLCJleHAiOjE3NzQwOTA5NDJ9._ZMSSKWiT18wE2i_RFkCbbapqAfa1xJ5yjmVV0vjmBA"
ALUMNI_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbHVtbmktMTIzIiwiZW1haWwiOiJhbHVtbmlAdGVzdC5jb20iLCJyb2xlIjoiYWx1bW5pIiwiaWF0IjoxNzczNDg2MTQyLCJleHAiOjE3NzQwOTA5NDJ9.EfV7acrz31SJ1c_ykZMA0GHeGK_b04tfdkumwcVYvzs"

echo "=== Admin Dashboard Stats ==="
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:5000/api/admin/dashboard-stats

echo "\n\n=== Alumni network ==="
curl -s -H "Authorization: Bearer $ALUMNI_TOKEN" http://localhost:5000/api/alumni/network

echo "\n\n=== Alumni batch mates ==="
curl -s -H "Authorization: Bearer $ALUMNI_TOKEN" http://localhost:5000/api/alumni/batch-mates
