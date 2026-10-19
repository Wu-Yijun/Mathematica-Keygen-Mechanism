/* ============================================================================
 *  Ghidra pseudocode (decompiled output) — NOT original source.
 *
 *  binary     : WolframEngine.dll
 *  sha256     : 9a9a7d88d1a9285bc792e885cf589374285b1a247116eb3bfaefb2f71d2bad6f
 *  function   : FUN_181cf30f0
 *  address    : 0x181cf30f0
 *  body       : 0x181cf30f0..0x181cf33d8
 *  signature  : undefined FUN_181cf30f0()
 *  provenance : REA Ghidra 12.1.4, operation "analyze_function"
 *
 *  Referenced strings:
   * 0x185c58240  "Expiration date \"%s\" not in format yyyy-mm-dd."
   * 0x185c58270  "Expiration date after mathid not in format yyyymmdd."
   * 0x185c582a8  "Expiration date format error: month not 1 to 12."
   * 0x185c582e0  "Expiration date format error: day not 1 to numDays."
   * 0x185c58318  "Password has expired."
   * 0x185c58318  "Password has expired."
 *
 *  Callees:
   * EXTERNAL:0xb56  API-MS-WIN-CRT-STRING-L1-1-0.DLL::strncpy
   * EXTERNAL:0xb99  API-MS-WIN-CRT-CONVERT-L1-1-0.DLL::atoi
   * EXTERNAL:0xbf6  API-MS-WIN-CRT-TIME-L1-1-0.DLL::_localtime64
   * EXTERNAL:0xbfc  API-MS-WIN-CRT-TIME-L1-1-0.DLL::_time64
   * 0x180620a00  FUN_180620a00
   * 0x181fe5cc0  __security_check_cookie
   * 0x182008f1f  VCRUNTIME140.DLL::strchr
   * 0x182008faf  API-MS-WIN-CRT-STRING-L1-1-0.DLL::strcpy
 * ============================================================================
 */


/* WARNING: Function: __security_check_cookie replaced with injection: security_check_cookie */

void FUN_181cf30f0(char *param_1,int *param_2,int param_3)

{
  bool bVar1;
  uint uVar2;
  int iVar3;
  int iVar4;
  uint uVar5;
  int iVar6;
  char *pcVar7;
  char *pcVar8;
  tm *ptVar9;
  size_t _Count;
  undefined1 auStack_958 [32];
  __time64_t local_938;
  char local_930 [5];
  char local_92b [2];
  undefined1 local_929;
  char local_926 [2];
  undefined1 local_924;
  char local_918 [8];
  char local_910 [248];
  char local_818 [2016];
  ulonglong local_38;
  
  local_38 = DAT_186d74040 ^ (ulonglong)auStack_958;
  if (param_2 != (int *)0x0) {
    *param_2 = 10000;
  }
  bVar1 = false;
  pcVar7 = strchr(param_1,0x40);
  if (pcVar7 != (char *)0x0) {
    if (pcVar7[1] == ':') {
      strcpy(local_818,param_1);
      pcVar8 = strchr(local_818,0x40);
      *pcVar8 = '\0';
      FUN_180620a00(&DAT_18806c560,0x834,"Expiration date \"%s\" not in format yyyy-mm-dd.",
                    local_818);
      param_1 = pcVar7 + 2;
    }
    else {
      FUN_180620a00(&DAT_18806c560,0x834,"Expiration date after mathid not in format yyyymmdd.");
      param_1 = pcVar7 + 1;
    }
  }
  strncpy(local_918,param_1,0xfa);
  pcVar7 = local_918;
  do {
    if (bVar1) goto LAB_181cf3206;
    if ((*pcVar7 < '0') || ('9' < *pcVar7)) {
      if ((longlong)pcVar7 - (longlong)local_918 != 6) {
      }
      bVar1 = true;
    }
    pcVar7 = pcVar7 + 1;
  } while (pcVar7 < local_910);
  if (bVar1) {
LAB_181cf3206:
    if (param_3 == 0) {
    }
    if (local_918[6] != '\0') {
    }
  }
  if (local_910[0] == '\0') {
    _time64(&local_938);
    ptVar9 = _localtime64(&local_938);
    local_924 = 0;
    local_929 = 0;
    _Count = 2;
    if (!bVar1) {
      _Count = 4;
    }
    local_930[_Count] = '\0';
    strncpy(local_930,local_918,_Count);
    strncpy(local_92b,local_918 + _Count,2);
    uVar2 = 4;
    if (!bVar1) {
      uVar2 = 6;
    }
    strncpy(local_926,local_918 + uVar2,2);
    uVar2 = atoi(local_930);
    iVar3 = atoi(local_92b);
    iVar4 = atoi(local_926);
    if (iVar3 - 1U < 0xc) {
      if (bVar1) {
        if ((int)uVar2 < 0x59) {
          uVar2 = uVar2 + 2000;
        }
        else {
          uVar2 = uVar2 + 0x76c;
        }
      }
      switch(iVar3) {
      default:
        iVar6 = 0x1f;
        break;
      case 2:
        uVar5 = uVar2 & 0x80000003;
        if ((int)uVar5 < 0) {
          uVar5 = (uVar5 - 1 | 0xfffffffc) + 1;
        }
        if (((uVar5 == 0) && (uVar2 != ((int)uVar2 / 100) * 100)) ||
           (uVar2 == ((int)uVar2 / 400) * 400)) {
          iVar6 = 0x1d;
        }
        else {
          iVar6 = 0x1c;
        }
        break;
      case 4:
      case 6:
      case 9:
      case 0xb:
        iVar6 = 0x1e;
      }
      if ((0 < iVar4) && (iVar4 <= iVar6)) {
        ptVar9->tm_year = ptVar9->tm_year + 0x76c;
        ptVar9->tm_mon = ptVar9->tm_mon + 1;
        if (param_2 != (int *)0x0) {
          *param_2 = ((((uVar2 - ptVar9->tm_year) * 0xc - ptVar9->tm_mon) + iVar3) * 0x1f -
                     ptVar9->tm_mday) + iVar4;
        }
      }
    }
  }
}
