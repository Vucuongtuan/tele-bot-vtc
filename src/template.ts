import type { Article } from "./types.js";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Kept server-side so the generated index.html never depends on Vue state. */
export function renderNewsletter(folderName: string, articles: Article[], imageSources?: string[]): string {
  const cards = articles.map((article, index) => {
    const imageSource = imageSources?.[index] ?? `https://newsletter.wowweekend.vn/${encodeURIComponent(folderName)}/assets/img/banner${index + 1}_2x.jpg`;
    return `
      <table class="spacer sp" style="border-collapse: collapse; border-spacing: 0; display: none; padding: 0; text-align: left; vertical-align: top; width: 100%"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="25px" style="-moz-hyphens: auto; -webkit-hyphens: auto; Margin: 0; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 5px; font-weight: normal; hyphens: auto; line-height: 25px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
      <table class="spacer pc" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="25px" style="-moz-hyphens: auto; -webkit-hyphens: auto; Margin: 0; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: normal; hyphens: auto; line-height: 25px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" class="box-margin"><tbody><tr><td style="text-align: center;" valign="top" class="img-fares"><center data-parsed="" style="width: 100%; text-align: center; margin: auto;"><a href="${escapeHtml(article.url)}" class="blog-link-${index + 1}" target="_blank" style="line-height: 22px; margin: 0; padding: 0; text-align: center; display: inline-block; text-decoration: none;"><img border="0" src="${escapeHtml(imageSource)}" height="292" width="520" style="display: block;"></a></center></td></tr></tbody></table>
      <table class="spacer pc" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="20px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: Helvetica, Arial, sans-serif; font-size: 20px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
      <table class="spacer sp" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%; display: none;"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="20px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: Helvetica, Arial, sans-serif; font-size: 20px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
      <p class="category blog-cate-${index + 1}" style="font-family: 'Arial', Helvetica, sans-serif; font-size: 12px; margin: 0; font-weight: normal; color: #A37E2C; text-align: left; margin-bottom: 10px; text-transform: uppercase;">${escapeHtml(article.cate)}</p>
      <p class="title-cate title-big blog-title-${index + 1}" style="color: #036039; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 400; line-height: 32px; margin: 0; margin-bottom: 10px; padding: 0; text-align: left;"><a href="${escapeHtml(article.url)}" class="blog-link-${index + 1}" target="_blank" style="color: #036039; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-weight: normal; line-height: 32px; margin: 0; padding: 0; text-align: left; text-decoration: none">${escapeHtml(article.title)}</a></p>
      <p class="c_text blog-des-${index + 1}" style="color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; margin: 0; margin-bottom: 10px; padding: 0; text-align: left;">${escapeHtml(article.des)}</p>`;
  }).join("");
  return bodyHtml().replace("<!-- Render content here -->", cards);
}





export const bodyHtml = () =>{


    const templateHTML = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en" style="background-color: #036039; margin: 0 auto; max-width: 960px">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>WOWWEEKEND</title>
  <link href="https://fonts.googleapis.com/css?family=Bitter:400,500,600,700&amp;subset=latin-ext,vietnamese" rel="stylesheet">
  <style>
    @media only screen {
      html {
        min-height: 100%;
        background: #f3f3f3;
      }
    }

    @media only screen and (max-width: 670px) {
      table.body img {
        /* width: auto; */
        height: auto;
      }

      table.body center {
        min-width: 0 !important;
      }

      table.body .container {
        width: 100% !important;
      }

      table.body .columns {
        height: auto !important;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
        /* padding-left: 20px !important;
        padding-right: 20px !important; */
      }
      .box-mobile {
        margin-bottom: 20px !important;
      }

      table.body .columns .columns {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      th.small-4 {
        display: inline-block !important;
        width: 33.33333% !important;
      }

      th.small-8 {
        display: inline-block !important;
        width: 66.66667% !important;
      }

      th.small-12 {
        display: inline-block !important;
        width: 100% !important;
      }

      .columns th.small-12 {
        display: block !important;
        width: 100% !important;
      }
      .box-wrap {
        border-radius: 0 !important;
      }
    }

    @media screen and (max-width: 568px) {
      .row .container h1 {
        font-size: 22px !important;
        padding-top: 10px !important;
      }
      .row .container h2 {
        font-size: 18px !important;
      }
    }

    @media screen and (max-width: 568px) {
      .row .container ul li p {
        font-size: 13px !important;
        line-height: 19px !important;
      }
    }

    @media screen and (max-width: 568px) {
      .img-fares img,
      .img-new img {
        width: 100% !important;
        height: auto !important;
      }

      .box-fares {
        margin-bottom: 10px !important;
        width: 100%;
        margin: auto;
      }

      .box-margin {
        width: 100% !important;
      }

      .des-new {
        padding: 10px 0 0 !important;
      }

      .m_width {
        width: 100% !important;
        display: block;
      }
      .bg-footer {
        width: 100% !important;
        height: auto !important;
      }
    }

    @media screen and (max-width: 568px) {
      .pc {
        display: none;
      }
      .pc_qr {
        display: none !important;
      }

      .sp {
        display: block !important;
      }
      .row .container p {
        font-size: 14px !important;
      }
      .row .container p.c_text {
        font-size: 14px !important;
        margin-bottom: 10px !important;
        line-height: 24px !important;
      }

      .fly-date p {
        height: 7px !important;
        margin-bottom: 0;
      }

      .code-sale {
        font-size: 9px !important;
      }

      .table-responsive td {
        font-size: 11px !important;
      }
      .box-qrcode {
        width: 100% !important;
      }
      .app-qrcode img {
        width: 116px !important;
      }
      .m_title {
        margin-bottom: 10px !important;
      }
      .row .container p.title-cate {
        line-height: 24px !important;
      }
      .row .container p.title-big {
        font-size: 18px !important;
      }
      .row .container p.title-small {
        font-size: 13px !important;
      }
      .spacer-sp {
        width: 10px !important;
      }
    }
  </style>
</head>

<body style="-moz-box-sizing: border-box; -ms-text-size-adjust: 100%; -webkit-box-sizing: border-box; -webkit-text-size-adjust: 100%; background-color: #036039; background-color: #036039; box-sizing: border-box; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0 auto; max-width: 960px; min-width: 100%; padding: 0; text-align: left; width: 100% !important">
  <span class="preheader" style="color: #f3f3f3; display: none !important; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; mso-hide: all !important; opacity: 0; overflow: hidden; visibility: hidden"></span>
  <table class="body" style="background: none; border-collapse: collapse; border-spacing: 0; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; height: 100%; line-height: 1.3; margin: 0; padding: 0; text-align: left; vertical-align: top; width: 100%">
    <tr style="padding: 0; text-align: left; vertical-align: top">
      <td class="center" align="center" valign="top" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; hyphens: auto; line-height: 1.3; margin: 0; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">
        <center data-parsed="" style="min-width: 650px; width: 100%">
          <table class="spacer pc float-center" style="border-collapse: collapse; border-spacing: 0; float: none; margin: 0 auto; padding: 0; text-align: center; vertical-align: top; width: 100%">
            <tbody>
              <tr style="padding: 0; text-align: center; vertical-align: top">
                <td height="70px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 50px; font-weight: normal; hyphens: auto; line-height: 70px; margin: 0; mso-line-height-rule: exactly; padding: 0 !important;; text-align: center; word-wrap: break-word"></td>
              </tr>
            </tbody>
          </table>
          <table align="center" class="container box-wrap float-center" style="border-radius: 12px; overflow: hidden; background: #fefefe; background-color: #fff; border-collapse: collapse; border-spacing: 0; float: none; margin: 0 auto; padding: 0; text-align: center; vertical-align: top; width: 600px; max-width: 600px">
            <tbody>
              <tr style="padding: 0; text-align: left; vertical-align: top">
                <td style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; hyphens: auto; line-height: 1.3; margin: 0; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">
                  <table class="row banner-row" style="border-collapse: collapse; border-spacing: 0; display: table; padding: 0; position: relative; text-align: left; vertical-align: top; width: 100%">
                    <tbody>
                      <tr style="padding: 0; text-align: left; vertical-align: top">
                        <th class="small-12 large-12 columns first last" style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0 auto; padding: 0; padding-bottom: 0; padding-left: 0; padding-right: 0; text-align: left; width: 600px">
                          <table style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%">
                            <tr style="padding: 0; text-align: left; vertical-align: top">
                              <th style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: left">
                                <table align="center" class="container" style="background: #FFFFFF; background-color: #FFFFFF; border-collapse: collapse; border-spacing: 0; margin: 0 auto; padding: 0; text-align: inherit; vertical-align: top; width: 100%">
                                  <tbody>
                                    <tr style="padding: 0; text-align: left; vertical-align: top">
                                      <td style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; hyphens: auto; line-height: 1.3; margin: 0; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">
                                        <center data-parsed="" style="min-width: 590px; width: 100%">
                                          <a href="https://wowweekend.vn/" target="_blank" style="line-height: 22px; margin: 0; padding: 0; text-align: center; display: inline-block; text-decoration: none;">
                                            <img src="https://newsletter.wowweekend.vn/2021/210805_Enews_template/assets/img/top_2x.png" alt="" align="center" class="float-center" style="-ms-interpolation-mode: bicubic; clear: both; display: block; float: none; margin: 0 auto; width: 100%; max-width: 100%; height: auto; outline: none; text-align: center; text-decoration: none;" width="600" height="226" />
                                          </a>
                                        </center>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </th>
                              <th class="expander" style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0 !important; text-align: left; visibility: hidden; width: 0"></th>
                            </tr>
                            <tr style="padding: 0; text-align: left; vertical-align: top">
                              <th style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: left">
                                <table align="center" class="container content" style="background-color: #FFFFFF; background: #FFFFFF; border-collapse: collapse;; border-spacing: 0; margin: 0 auto; padding: 0; text-align: inherit; vertical-align: top; width: 100%">
                                  <tbody>
                                    <tr style="padding: 0; text-align: left; vertical-align: top">
                                      <td style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; hyphens: auto; line-height: 1.3; margin: 0; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">
                                        <table class="row" style="background-color: #FFFFFF; background: #FFFFFF; border-collapse: collapse; border-spacing: 0; display: table; padding: 0; position: relative; text-align: left; vertical-align: top; width: 100%;">
                                          <tbody>
                                            <tr style="padding: 0; text-align: left; vertical-align: top">
                                              <th class="small-12 large-12 columns first last" style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0 auto; padding: 0; padding: 0; padding-left: 40px; padding-right: 40px; text-align: left; width: 100%">
                                                <table style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%">
                                                  <tr style="padding: 0; text-align: left; vertical-align: top">
                                                    <th style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: left">

                                                    <!-- Render content here -->


                                                      <table class="spacer pc" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="20px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: Helvetica, Arial, sans-serif; font-size: 20px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
                                                      <table class="spacer sp" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%; display: none;"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="20px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: Helvetica, Arial, sans-serif; font-size: 20px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
                                                      </th>
                                                    <th class="expander" style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0 !important; text-align: left; visibility: hidden; width: 0"></th>
                                                  </tr>
                                                </table>
                                              </th>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </th>
                            </tr>
                          </table>
                        </th>
                      </tr>
                    </tbody>
                  </table>
                  <table class="row contact-row" style="background: #F2F7F5; background-color: #F2F7F5; border-collapse: collapse; border-spacing: 0; display: table; padding: 0; position: relative; text-align: left; vertical-align: top; width: 100%; border-top: 1px solid #9E7E3B;">
                    <tbody>
                      <tr style="padding: 0; text-align: left; vertical-align: top">
                        <th class="small-12 large-12 columns first last" style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0 auto; padding: 0; padding-bottom: 0; padding-left: 0 !important; padding-right: 0 !important; text-align: left; width: 100%">
                          <table style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%">
                            <tr style="padding: 0; text-align: left; vertical-align: top">
                              <th style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: left">
                                <table align="center" bgcolor="#F2F7F5" border="0" cellpadding="0" cellspacing="0" class="container" style="background: #F2F7F5; background-color: #F2F7F5; border-collapse: collapse; border-spacing: 0; display: table; padding: 0; position: relative; text-align: left; vertical-align: top; width: 100%; max-width: 650px;">
                                  <tbody>
                                    <tr>
                                      <td align="center" style="padding-bottom: 0; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 20px; background-color: #F2F7F5; color: #000;" valign="top">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                          <tbody>
                                            <tr>
                                              <td align="center" class="m_width" valign="top" width="70%">
                                                <table align="center" border="0" cellpadding="0" cellspacing="0" class="box-qrcode" width="100%">
                                                  <tbody>
                                                    <tr>
                                                      <td style="text-align: center; margin: 15px;" valign="middle">
                                                        <table style="border-collapse: collapse; border-spacing: 0; display: block; padding: 0; text-align: left; vertical-align: top; width: 100%"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="40px" style="-moz-hyphens: auto; -webkit-hyphens: auto; Margin: 0; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 25px; font-weight: normal; hyphens: auto; line-height: 40px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
                                                        <p class="text-center privacy-link" style="color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 28px; margin: 0; margin-bottom: 0; padding: 0; text-align: center">Liên hệ Quảng cáo</p>
                                                        <p class="text-center privacy-link" style="color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 28px; margin: 0; margin-bottom: 0; padding: 0; text-align: center">Email: <a href="mailto:business@wowweekend.com" style=" color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-weight: normal; line-height: 28px; margin: 0; padding: 0; text-align: left; text-decoration: none"><strong>business@wowweekend.com</strong></a></p>
                                                        <p class="text-center privacy-link" style="color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 28px; margin: 0; margin-bottom: 10px; padding: 0; text-align: center">Hotline: <span style="color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-weight: normal; line-height: 28px; margin: 0; padding: 0; text-align: left; text-decoration: none"><strong>+84 888 686 318</strong></span></p>
                                                        <table style="border-collapse: collapse; border-spacing: 0; display: block; padding: 0; text-align: left; vertical-align: top; width: 100%"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="5px" style="-moz-hyphens: auto; -webkit-hyphens: auto; Margin: 0; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 5px; font-weight: normal; hyphens: auto; line-height: 5px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
                                                        <p class="text-center privacy-link" style="color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 28px; margin: 0; margin-bottom: 0; padding: 0; text-align: center">Tải ứng dụng</p>
                                                        <table align="center" border="0" cellpadding="0" cellspacing="0" class="box-qrcode" width="100%">
                                                          <tbody>
                                                            <tr>
                                                              <td style="text-align: right; padding: 10px 0;" valign="top" class="img-fares">
                                                                <a class="app-qrcode" href="https://apps.apple.com/vn/app/wowweekend/id1450251312" style="color: #2199e8; font-family: 'Montserrat', Arial, sans-serif; font-weight: normal; line-height: 28px; margin: 0; padding: 0; text-align: left; text-decoration: none;">
                                                                  <img src="https://newsletter.wowweekend.vn/2021/210805_Enews_template/assets/img/icon_ios_2x.png" alt="" align="center" class="float-center" style="-ms-interpolation-mode: bicubic; clear: both; float: none; margin: 0; max-width: 100%; height: auto; outline: none; text-align: right; text-decoration: none;"
                                                                  width="150" height="45" /></a>
                                                              </td>
                                                              <td width="10" class="pc" style="display: block"></td>
                                                              <td style="text-align: left; padding: 10px 0;" valign="top" class="img-fares">
                                                                <a class="app-qrcode" href="https://play.google.com/store/apps/details?id=com.wowweekend" style="color: #2199e8; font-family: 'Montserrat', Arial, sans-serif; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: left; text-decoration: none;">
                                                                  <img src="https://newsletter.wowweekend.vn/2021/210805_Enews_template/assets/img/icon_android_2x.png" alt="" align="center" class="float-center" style="-ms-interpolation-mode: bicubic; clear: both; float: none; margin: 0; max-width: 100%; height: auto; outline: none; text-align: center; text-decoration: none;"
                                                                width="150" height="45" /></a>
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                        <table class="spacer pc" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="20px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: Helvetica, Arial, sans-serif; font-size: 20px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
                                                        <table class="spacer sp" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%; display: none;"><tbody><tr style="padding: 0; text-align: left; vertical-align: top"><td height="20px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: Helvetica, Arial, sans-serif; font-size: 20px; font-weight: normal; hyphens: auto; line-height: 20px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">&#xA0;</td></tr></tbody></table>
                                                        <table style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%">
                                                          <tr style="padding: 0; text-align: left; vertical-align: top">
                                                            <th style="color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: center">
                                                              <p class="text-center" style="color: #222222; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: center;">
                                                                <a class="app-link" href="https://www.facebook.com/WowWeekend/" style="color: #2199e8; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: center; text-decoration: none">
                                                                  <img src="https://newsletter.wowweekend.vn/2021/210805_Enews_template/assets/img/icon_facebook_2x.png" alt="Facebook" style="-ms-interpolation-mode: bicubic; border: none; clear: both; display: inline-block; width: 32px; height: auto; max-width: 100%; outline: none; text-decoration: none; vertical-align: middle;" /></a>&nbsp;
                                                                <a class="app-link" href="https://www.instagram.com/wowweekend/" style="color: #2199e8; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: left; text-decoration: none">
                                                                  <img src="https://newsletter.wowweekend.vn/2021/210805_Enews_template/assets/img/icon_instagram_2x.png" alt="instagram" style="-ms-interpolation-mode: bicubic; border: none; clear: both; display: inline-block; width: 32px; height: auto; max-width: 100%; outline: none; text-decoration: none; vertical-align: middle;" /></a>&nbsp;
                                                                <a class="app-link" href="https://www.youtube.com/channel/UCgGxajeSnoXEOHF7zbzaDTg" style="color: #2199e8; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-weight: normal; line-height: 1.3; margin: 0; padding: 0; text-align: left; text-decoration: none">
                                                                  <img src="https://newsletter.wowweekend.vn/2021/210805_Enews_template/assets/img/icon_youtube_2x.png" alt="Youtube" style="-ms-interpolation-mode: bicubic; border: none; clear: both; display: inline-block; width: 32px; height: auto; max-width: 100%; outline: none; text-decoration: none; vertical-align: middle;" /></a>
                                                              </p>
                                                            </th>
                                                          </tr>
                                                        </table>
                                                        <table class="spacer" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%">
                                                          <tbody>
                                                            <tr style="padding: 0; text-align: left; vertical-align: top">
                                                              <td height="15px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 40px; font-weight: normal; hyphens: auto; line-height: 15px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">
                                                                &#xA0;
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                        <table style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: center; vertical-align: top; width: 100%;">
                                                          <tbody>
                                                            <tr style="padding: 0 15px; text-align: left; vertical-align: top;">
                                                              <td style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Helvetica', Arial, sans-serif; font-size: 16px; font-weight: normal; hyphens: auto; line-height: 1.3; margin: 0; text-align: center; vertical-align: top; word-wrap: break-word;">
                                                                <p class="text-center privacy-link" style="color: #222222; font-family: 'Bitter', 'Helvetica', Arial, sans-serif; font-size: 12px; font-weight: 400; line-height: 1.4; margin: 0; margin-bottom: 0; padding: 0; text-align: center">COPYRIGHT © 2023, WOWWEEKEND. <font style="white-space: nowrap;">ALL RIGHTS RESERVED.</font></p>
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                        <table class="spacer" style="border-collapse: collapse; border-spacing: 0; padding: 0; text-align: left; vertical-align: top; width: 100%">
                                                          <tbody>
                                                            <tr style="padding: 0; text-align: left; vertical-align: top">
                                                              <td height="30px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 40px; font-weight: normal; hyphens: auto; line-height: 30px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">
                                                                &#xA0;
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                  </tbody>
                                </table>
                              </th>
                              <th class="expander" style="color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; line-height: 1.3; margin: 0; padding: 0 !important; text-align: left; visibility: hidden; width: 0"></th>
                            </tr>
                          </table>
                        </th>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
          <table class="spacer pc float-center" style="border-collapse: collapse; border-spacing: 0; float: none; margin: 0 auto; padding: 0; text-align: center; vertical-align: top; width: 100%">
            <tbody>
              <tr style="padding: 0; text-align: left; vertical-align: top">
                <td height="50px" style="-moz-hyphens: auto; -webkit-hyphens: auto; border-collapse: collapse !important; color: #0a0a0a; font-family: 'Bitter', Helvetica, Arial, sans-serif; font-size: 50px; font-weight: normal; hyphens: auto; line-height: 50px; margin: 0; mso-line-height-rule: exactly; padding: 0; text-align: left; vertical-align: top; word-wrap: break-word">
                  &#xA0;
                </td>
              </tr>
            </tbody>
          </table>
        </center>
      </td>
    </tr>
  </table>

  <!-- prevent Gmail on iOS font size manipulation -->
  <div style="display:none; white-space:nowrap; font:15px courier; line-height:0">
    &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
    &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
    &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
  </div>
</body>

</html>

        `;
        return templateHTML
}
