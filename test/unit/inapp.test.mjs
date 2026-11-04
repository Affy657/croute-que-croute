import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { inApp, inAppNote } from "../../public/js/app/inapp.js";

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

test("navigateur d'appli : Snapchat, Instagram, Facebook, Messenger et TikTok reconnus, sur iPhone comme sur Android", () => {
  assert.equal(inApp(IOS + " Snapchat/14.30.0.33 (like Safari/8621.1.15.10.7, panda)"), "Snapchat");
  assert.equal(inApp(IOS + " Instagram 312.0.0.32.112 (iPhone14,5; iOS 18_7; fr_FR)"), "Instagram");
  assert.equal(inApp(IOS + " [FBAN/FBIOS;FBAV/480.0.0.40.108;FBBV/123]"), "Facebook");
  assert.equal(inApp(IOS + " [FBAN/MessengerForiOS;FBAV/480.0.0.40.108]"), "Messenger");
  assert.equal(inApp(IOS + " musical_ly_37.0.0 JsSdk/2.0 BytedanceWebview/d8a21c6"), "TikTok");
  assert.equal(inApp(ANDROID + " Instagram 312.0.0.32.112 Android"), "Instagram");
  assert.equal(inApp(ANDROID.replace("Mobile Safari", "Mobile Safari [FB_IAB/FB4A;FBAV/480.0.0.40.108;]")), "Facebook");
});

test("navigateur d'appli : Safari, Chrome et l'appli installée ne sont pas signalés", () => {
  assert.equal(inApp(IOS + " Safari/604.1"), null);
  assert.equal(inApp(IOS.replace("Version/27.2", "CriOS/156.0.8078.54") + " Safari/604.1"), null);
  assert.equal(inApp(ANDROID), null);
  assert.equal(inAppNote(IOS + " Safari/604.1"), null);
});

test("navigateur d'appli : le message renvoie vers Safari sur iPhone, vers Chrome sur Android", () => {
  const ios = inAppNote(IOS + " Snapchat/14.30.0.33"), android = inAppNote(ANDROID + " Snapchat/13.10.0.42");
  assert.match(ios, /^Tu es dans Snapchat : ton compte n'existera que dans Snapchat\./);
  assert.match(ios, /dans Safari/);
  assert.doesNotMatch(ios, /Chrome/);
  assert.match(android, /dans Chrome/);
});

test("navigateur d'appli : l'installation n'y est pas proposée, Safari la propose toujours", async () => {
  const phone = (userAgent) => Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent, platform: "iPhone", maxTouchPoints: 5 } });
  window.matchMedia = () => ({ matches: false });
  const { installMode, shouldSuggest } = await import("../../public/js/app/install.js");
  phone(IOS + " Snapchat/14.30.0.33");
  assert.equal(installMode(), "inapp");
  assert.equal(shouldSuggest(), false);
  phone(IOS + " Safari/604.1");
  assert.equal(installMode(), "ios");
  assert.equal(shouldSuggest(), true);
});

test("connexion Google : bloquée dans les applis et l'appli iPhone, ouverte dans Safari, Chrome et l'appli Android", async () => {
  const phone = (userAgent) => Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent, platform: "", maxTouchPoints: 0 } });
  let installed = false;
  window.matchMedia = () => ({ matches: installed });
  const { googleBlocked } = await import("../../public/js/app/install.js");
  phone(IOS + " Snapchat/14.30.0.33");
  assert.equal(googleBlocked(), true);
  phone(IOS + " Safari/604.1");
  assert.equal(googleBlocked(), false);
  installed = true;
  assert.equal(googleBlocked(), true);
  phone("Mozilla/5.0 (Linux; Android 14) Chrome/130.0.0.0 Mobile");
  assert.equal(googleBlocked(), false);
});
