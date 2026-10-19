/* ============================================================================
 *  Ghidra pseudocode (decompiled output) — NOT original source.
 *
 *  binary     : WolframEngine.dll
 *  sha256     : 9a9a7d88d1a9285bc792e885cf589374285b1a247116eb3bfaefb2f71d2bad6f
 *  function   : FUN_181cf3d50
 *  address    : 0x181cf3d50
 *  body       : 0x181cf3d50..0x181cf3f79, 0x181cf3f89..0x181cf3f91
 *  signature  : undefined FUN_181cf3d50()
 *  provenance : REA Ghidra 12.1.4, operation "analyze_function"
 *
 *  Referenced strings:
   * 0x185c58200  "Bad password."
   * 0x185c58200  "Bad password."
   * 0x185c58210  "Password not in format dddd-ddd-ddd."
 *
 *  Callees:
   * 0x180629d00  FUN_180629d00
   * 0x181fe5cc0  __security_check_cookie
   * 0x182008fb5  API-MS-WIN-CRT-STRING-L1-1-0.DLL::strlen
 * ============================================================================
 */


/* WARNING: Function: __security_check_cookie replaced with injection: security_check_cookie */

void FUN_181cf3d50(char *param_1,uint *param_2,int *param_3)

{
  char *pcVar1;
  char cVar2;
  char cVar3;
  char cVar4;
  char cVar5;
  char cVar6;
  int iVar7;
  int iVar8;
  size_t sVar9;
  char *pcVar10;
  ulonglong uVar11;
  double dVar12;
  undefined1 auStack_a8 [32];
  uint local_88;
  uint local_84;
  uint *local_80;
  char local_78;
  char local_77;
  char local_76;
  char local_75;
  char local_74;
  undefined1 local_73;
  char local_72;
  char local_71;
  char local_70;
  char local_6f;
  char local_6e;
  undefined1 local_6d;
  ulonglong local_68;
  
  local_68 = DAT_186d74040 ^ (ulonglong)auStack_a8;
  local_80 = param_2;
  sVar9 = strlen(param_1);
  if (((sVar9 == 0xc) && (param_1[4] == '-')) && (param_1[8] == '-')) {
    cVar2 = *param_1;
    cVar3 = cVar2;
    pcVar10 = param_1;
    while (cVar3 != '\0') {
      if ((cVar3 != '-') && (9 < (byte)(cVar3 - 0x30U))) {
      }
      pcVar1 = pcVar10 + 1;
      pcVar10 = pcVar10 + 1;
      cVar3 = *pcVar1;
    }
    local_75 = param_1[1];
    local_77 = param_1[2];
    local_76 = param_1[6];
    local_78 = param_1[3];
    local_74 = param_1[10];
    cVar3 = param_1[5];
    cVar4 = param_1[9];
    cVar5 = param_1[7];
    cVar6 = param_1[0xb];
    local_73 = 0;
    FUN_180629d00(&local_78,&DAT_185bdd900,&local_88);
    local_6d = 0;
    dVar12 = ((double)local_88 / 99999.0) * 65535.0;
    uVar11 = (ulonglong)dVar12;
    iVar7 = (int)uVar11;
    iVar8 = iVar7 + 1;
    if (dVar12 <= (double)(uVar11 & 0xffffffff)) {
      iVar8 = iVar7;
    }
    *local_80 = iVar8 - 0x72faU & 0xffff;
    local_72 = cVar5;
    local_71 = cVar6;
    local_70 = cVar4;
    local_6f = cVar2;
    local_6e = cVar3;
    FUN_180629d00(&local_72,&DAT_185bdd900,&local_84);
    dVar12 = ((double)local_84 / 99999.0) * 65535.0;
    uVar11 = (ulonglong)dVar12;
    iVar7 = (int)uVar11;
    iVar8 = iVar7 + 1;
    if (dVar12 <= (double)(uVar11 & 0xffffffff)) {
      iVar8 = iVar7;
    }
    *param_3 = iVar8;
  }
}
