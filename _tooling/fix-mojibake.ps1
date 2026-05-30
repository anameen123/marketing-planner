$p = 'C:\Users\roses\CODE PROJECT\marketing_schedule_FINAL4.html'
$bytes = [System.IO.File]::ReadAllBytes($p)
$mojibakeText = [System.Text.Encoding]::UTF8.GetString($bytes)
$originalBytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($mojibakeText)
[System.IO.File]::WriteAllBytes($p, $originalBytes)
Write-Host ("Wrote " + $originalBytes.Length + " bytes (was " + $bytes.Length + ")")
