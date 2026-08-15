# SHA-256 архивов лабораторных материалов

Контрольные суммы актуальны для последней пересборки опубликованного комплекта.

```text
3E35F86E663EDE32D99F1025EBF8972C54A654C1E1C2426D0F9904A4911DB0E1  all-labs-markdown.zip
71BE4D696C4AA014FBE385539DE06A4D2A6504F44AF162EAFBE9B964D8A2900E  inspector-labs-markdown.zip
2E402F2EE38FAEEC9600B8C9F9671504064879430818691860B30C2130E47015  scanner-labs-markdown.zip
```

PowerShell:

```powershell
Get-FileHash .\all-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\inspector-labs-markdown.zip -Algorithm SHA256
Get-FileHash .\scanner-labs-markdown.zip -Algorithm SHA256
```

Если значение не совпало, не открывайте архив и скачайте его повторно с учебного портала.
