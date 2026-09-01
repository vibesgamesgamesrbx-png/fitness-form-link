# Google Sheets no painel da Juliana

A integração usa um Google Apps Script como ponte gratuita. O site envia somente os dados necessários para a agenda; informações de saúde e respostas da anamnese não são enviadas.

## 1. Crie a planilha

1. Abra o Google Sheets e crie uma planilha vazia.
2. Copie o ID da planilha na URL. É o trecho entre `/d/` e `/edit`.

## 2. Crie o Apps Script

Na planilha, abra **Extensões → Apps Script** e substitua o conteúdo pelo código abaixo:

```javascript
const SHEET_ID = "COLE_AQUI_O_ID_DA_PLANILHA";
const TOKEN = "TROQUE_POR_UM_TOKEN_SEGURO";
const ABA = "Agendamentos";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    if (body.token !== TOKEN) {
      return json({ ok: false, error: "Token inválido" });
    }

    const agendamentos = Array.isArray(body.agendamentos) ? body.agendamentos : [];
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(ABA) || ss.insertSheet(ABA);

    const headers = [
      "Nome",
      "WhatsApp",
      "Plano",
      "Forma de pagamento",
      "Data",
      "Horário",
      "Pagamento",
      "Agendamento",
      "ID",
    ];

    const rows = agendamentos
      .map((a) => [
        String(a.nome || ""),
        String(a.whatsapp || ""),
        String(a.plano || ""),
        String(a.forma_pagamento || ""),
        String(a.data || ""),
        String(a.horario || ""),
        String(a.status_pagamento || ""),
        String(a.status_agendamento || ""),
        String(a.id || ""),
      ])
      .sort((a, b) => `${a[4]} ${a[5]}`.localeCompare(`${b[4]} ${b[5]}`));

    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (rows.length) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);

    return json({ ok: true, count: rows.length });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Troque `SHEET_ID` e `TOKEN` antes de publicar.

## 3. Publique como Web App

No Apps Script:

1. Clique em **Implantar → Nova implantação**.
2. Tipo: **Aplicativo da Web**.
3. Executar como: **Eu**.
4. Quem tem acesso: **Qualquer pessoa**.
5. Clique em **Implantar**.
6. Copie a URL que termina em `/exec`.

## 4. Configure no painel

Entre no painel administrativo do site. Na seção **Google Sheets**:

1. Cole a URL `/exec`.
2. Digite exatamente o mesmo token usado no Apps Script.
3. Clique em **Salvar configuração**.
4. Clique em **Sincronizar agora**.

A planilha será recriada a partir dos agendamentos atuais, evitando duplicações quando a sincronização for repetida.

## Segurança e privacidade

- Não coloque senha da conta Google no código do site.
- O token funciona como uma proteção contra envios acidentais, mas fica armazenado no navegador do administrador e não deve ser tratado como um segredo absoluto.
- O site envia apenas nome, WhatsApp, plano, forma de pagamento, data, horário e status do agendamento.
- Dados de saúde, medicamentos, caneta emagrecedora e demais respostas da anamnese ficam fora dessa integração.
