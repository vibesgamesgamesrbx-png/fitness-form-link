# Ficha de Anamnese — Juliana Truglia

Site estático para preenchimento de ficha de anamnese e envio pelo WhatsApp da Personal Trainer.

## O que o site faz

- formulário responsivo para celular;
- validação dos campos;
- data de nascimento limitada de 1900 a 2020;
- idade limitada de 5 a 110 anos;
- campo de WhatsApp da cliente para a personal poder retornar;
- geração local de uma imagem da ficha;
- abertura do WhatsApp pelo link oficial `wa.me`, com a mensagem preenchida;
- nenhum banco de dados, login, painel administrativo ou pagamento.

## Privacidade e envio

As respostas ficam apenas no navegador enquanto a pessoa preenche o formulário. O site não envia os dados para um servidor próprio.

Ao clicar em enviar, o navegador abre o WhatsApp usando `https://wa.me/`. A mensagem é enviada **pela própria conta do WhatsApp da cliente** depois que ela confirmar o envio no aplicativo/site do WhatsApp. Não existe uma API paga ou uma conta chamada Lovable enviando a ficha.

## Desenvolvimento

```sh
npm install
npm run dev
```

Para produção:

```sh
npm run build
```

O projeto usa GitHub Pages via GitHub Actions.