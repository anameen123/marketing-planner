# Sweep user-visible "Gemini" labels → "AI" / "GitHub Models" in the planner HTML.
# Intentionally narrow: only string literals that show up in the UI, NOT
# variable names, function names, or internal config keys.
$p = 'C:\Users\roses\CODE PROJECT\marketing_schedule_FINAL4.html'
$bytes = [System.IO.File]::ReadAllBytes($p)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

$pairs = @(
  # Cost meter + caps labels (user-visible chrome)
  @('🤖 Gemini calls',              '🤖 AI calls'),
  @('Gemini calls / day max',        'AI calls / day max'),
  # Status messages (toast / inline)
  @('⏳ Testing Gemini...',          '⏳ Testing AI...'),
  @('⏳ Asking Gemini...',           '⏳ Asking AI...'),
  @('Testing Gemini',                'Testing AI'),
  @('Asking Gemini',                 'Asking AI'),
  @('Gemini key works',              'AI token works'),
  @('Gemini key looks too short',    'AI token looks too short'),
  @('Gemini key looks too short — paste the full key',     'AI token looks too short — paste the full token'),
  @('Daily Gemini quota reached',    'Daily AI quota reached'),
  @('No Gemini key set',             'No AI token set'),
  @('No Gemini key —',               'No AI token —'),
  @('Gemini returned an empty response', 'AI returned an empty response'),
  @('Gemini returned no candidates', 'AI returned no candidates'),
  @('Could not parse Gemini response', 'Could not parse AI response'),
  @('Could not parse Gemini JSON',   'Could not parse AI JSON'),
  @('Bad JSON from Gemini',          'Bad JSON from AI'),
  @('Gemini returned no valid stop list', 'AI returned no valid stop list'),
  @('Gemini names did not match the pool', 'AI names did not match the pool'),
  @('Gemini couldn\\''t confidently identify this clinic', 'AI couldn''t confidently identify this clinic'),
  @('Gemini error',                  'AI error'),
  # Form helper text + tooltips
  @('Gemini auto-fill',              'AI auto-fill'),
  @('Gemini-assisted',               'AI-assisted'),
  @('Gemini-filled',                 'AI-filled'),
  @('Verify this Gemini-filled value','Verify this AI-filled value'),
  @('paste your AI Studio key',      'paste your GitHub Models token'),
  @('paste your free <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:#7030A0;text-decoration:underline">Google AI Studio key</a> to enable AI route explanations',
    'paste your free <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener" style="color:#7030A0;text-decoration:underline">GitHub Models token</a> to enable AI route explanations'),
  # Modal title
  @('Map v2 — Google Maps + Gemini AI settings', 'Map v2 — Google Maps + AI settings'),
  @('Map v2 — Google Maps + AI key + Gemini route advice', 'Map v2 — Google Maps + AI key + AI route advice'),
  # Generic "Gemini" remaining in UI strings (catches anything we missed)
  @('🤖 Gemini · route strategy',    '🤖 AI · route strategy'),
  @('Gemini quota',                  'AI quota')
)

$changedCount = 0
foreach($pair in $pairs){
  $before = $text.Length
  $text = $text.Replace($pair[0], $pair[1])
  $delta = $before - $text.Length
  if($delta -ne 0){ $changedCount++ }
}

# Write back as UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText($p, $text, $utf8NoBom)
Write-Host ("Swept " + $changedCount + " label patterns. File size now " + (Get-Item $p).Length + " bytes.")
