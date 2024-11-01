const puppeteer = require('puppeteer');
const dotenv = require('dotenv').config();

const solicitacao = require('./src/solicitacao.js');
const utils = require('./src/utils.js');

global.INDEX = process.env.MYADDR;

// main function
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto(INDEX + '/logon.aspx');

  // Login
  await page.type('#txtUsuario', process.env.MYUSER);
  await page.type('#txtSenha', process.env.MYPASS);
  await page.click('#btnEntrar');

  await page.waitForNavigation();

  console.log('Logado com sucesso!');

  // Espera até que tenha 4 abas ou mais antes de continuar
  const pages = await utils.waitFourOrMoreWindows(browser);

  // Fechar os pop-ups que abrem logo após o login
  pages.forEach(async (page) => {
    if (!page.url().includes('/painel.aspx')) await page.close();
  });

  // Apenas interrompe o programa se o dialog for crucial para o andamento do processo
  page.on('dialog', async (dialog) => {
    const message = dialog.message();
    switch (true) {
      case message.includes('Valor do Empenho maior que saldo orcamentário'):
        throw new Error(dialog.message());
        break;
      default:
        await dialog.accept();
    }
  });

  // Etapas do processo EXEMPLO
  await utils.mudar_setor(page, 7);
  await solicitacao.copiar_solicitacao(page, 257);

  //await browser.close();
})();
