#!/usr/bin/env node
/**
 * cli.ts — command line front-end for the mathpass scheme.
 *
 *   node cli.ts verify       <mathID> <activationKey> <password>
 *   node cli.ts acceptedcrc  <mathID> <activationKey> <password>
 *   node cli.ts generate     <mathID> <activationKey> <licenseCode> <expiryDate> [acceptedCrc]
 *   node cli.ts decode       <licenseCode|password>
 *   node cli.ts table
 */
import {
  ACCEPTED_CRC_TABLE_V15_0_1, acceptedCrcOf, generatePassword, messageOf, parsePassword, verify,
} from "./mathpass.ts";
import { decodeLicenseCode } from "./licenseCode.ts";

const [cmd, ...args] = process.argv.slice(2);
const USAGE = `usage:
  node cli.ts verify       <mathID> <activationKey> <password>
  node cli.ts acceptedcrc  <mathID> <activationKey> <password>
  node cli.ts generate     <mathID> <activationKey> <licenseCode> <expiryDate> [acceptedCrc]
  node cli.ts decode       <licenseCode|password>
  node cli.ts table`;

switch (cmd) {
  case "verify": {
    const [id, key, pw] = args;
    if (!id || !key || !pw) { console.error(USAGE); process.exit(2); }
    const r = verify(id, key, pw);
    console.log(JSON.stringify(r, null, 2));
    console.log(`\n=> ${r.valid ? "VALID" : "INVALID"}  (acceptedCrc=${r.acceptedCrc}, inTable=${r.inTable}, integrity=${r.integrityOk})`);
    process.exit(r.valid ? 0 : 1);
    break;
  }
  case "acceptedcrc": {
    const [id, key, pw] = args;
    if (!id || !key || !pw) { console.error(USAGE); process.exit(2); }
    const v = acceptedCrcOf(id, key, pw);
    console.log(`acceptedCrc = ${v} (0x${v.toString(16)})  inTable=${ACCEPTED_CRC_TABLE_V15_0_1.includes(v)}`);
    break;
  }
  case "generate": {
    const [id, key, licenseCode, expiry, sel] = args;
    if (!id || !key || !licenseCode || !expiry) { console.error(USAGE); process.exit(2); }
    const acceptedCrc = sel === undefined ? ACCEPTED_CRC_TABLE_V15_0_1[1] : Number(sel);
    if (!ACCEPTED_CRC_TABLE_V15_0_1.includes(acceptedCrc))
      console.warn(`warning: accepted CRC ${acceptedCrc} is not in this build's table; the kernel will reject it.`);
    const pw = generatePassword(id, key, licenseCode, expiry, acceptedCrc);
    console.log(`message     = ${messageOf(id, key, licenseCode, expiry)}`);
    console.log(`acceptedCrc = ${acceptedCrc}`);
    console.log(`password    = ${pw}`);
    console.log(`selfcheck   = ${verify(id, key, pw).valid ? "VALID" : "INVALID"}`);
    break;
  }
  case "decode": {
    const [licenseCodeOrPassword] = args;
    if (!licenseCodeOrPassword) { console.error(USAGE); process.exit(2); }
    const licenseCode = licenseCodeOrPassword.includes(":") ? parsePassword(licenseCodeOrPassword).licenseCode : licenseCodeOrPassword;
    const d = decodeLicenseCode(licenseCode);
    console.log(`LicenseCode = ${licenseCode}  (= 0x${d.value.toString(16)}, bits ${d.bits.join(",")})`);
    console.log(`product     = ${d.product}`);
    console.log(`class       = ${d.licenseClass}`);
    console.log(`capabilities= ${d.capabilities.join(", ")}`);
    break;
  }
  case "table":
    console.log(`WolframEngine.dll v15.0.1 accepted-CRC table (${ACCEPTED_CRC_TABLE_V15_0_1.length} entries):`);
    ACCEPTED_CRC_TABLE_V15_0_1.forEach((v, i) => console.log(`  [${i}] ${v} (0x${v.toString(16)})`));
    break;
  default:
    console.log(USAGE);
    process.exit(cmd ? 2 : 0);
}
