/* ============================================================================
 *  Ghidra pseudocode (decompiled output) — NOT original source.
 *
 *  binary     : WolframNB.exe
 *  sha256     : (front end, SystemFiles\FrontEnd\Binaries\Windows-x86-64)
 *  function   : FUN_140dac1f0
 *  address    : 0x140dac1f0
 *  body       : 0x140dac1f0..0x140dac478
 *  signature  : undefined FUN_140dac1f0()
 *  provenance : REA Ghidra 12.1.4, operation "analyze_function"
 *
 *  Referenced strings:
   * (none)
 *
 *  Callees:
   * EXTERNAL:0x304  VCRUNTIME140.DLL::strchr
   * EXTERNAL:0x361  API-MS-WIN-CRT-STRING-L1-1-0.DLL::strncpy
   * 0x1412e2ff0  __security_check_cookie
 * ============================================================================
 */


/* WARNING: Function: __security_check_cookie replaced with injection: security_check_cookie */

undefined8 FUN_140dac1f0(char *param_1,longlong param_2)

{
  longlong lVar1;
  char *pcVar2;
  char *pcVar3;
  size_t _Count;
  ulonglong uVar4;
  ulonglong uVar5;
  undefined1 auStack_888 [32];
  char local_868 [2103];
  undefined1 local_31;
  ulonglong local_28;
  ulonglong uVar6;
  
  local_28 = DAT_141858680 ^ (ulonglong)auStack_888;
  strncpy(local_868,param_1,0x838);
  uVar4 = 0xffffffffffffffff;
  local_31 = 0;
  uVar6 = 0xffffffffffffffff;
  do {
    uVar5 = uVar6 + 1;
    lVar1 = uVar6 + 1;
    uVar6 = uVar5;
  } while (local_868[lVar1] != '\0');
  _Count = 0;
  if (uVar5 != 0) {
    do {
      if (local_868[_Count] == ':') break;
      _Count = _Count + 1;
    } while (_Count < uVar5);
  }
  strncpy((char *)(param_2 + 0x4e0),local_868,_Count);
  *(undefined1 *)(param_2 + 0x4e0 + _Count) = 0;
  if (((_Count != uVar5) && (local_868[_Count] == ':')) &&
     (pcVar3 = local_868 + _Count + 1, pcVar3 != (char *)0x0)) {
    pcVar2 = strchr(pcVar3,0x3a);
    if (pcVar2 != (char *)0x0) {
      *pcVar2 = '\0';
      pcVar2 = pcVar2 + 1;
    }
    if (pcVar3 != (char *)0x0) {
      strncpy((char *)(param_2 + 0x1665),pcVar3,0x19);
      *(undefined1 *)(param_2 + 0x167d) = 0;
    }
    if (pcVar2 != (char *)0x0) {
      pcVar3 = strchr(pcVar2,0x3a);
      if (pcVar3 != (char *)0x0) {
        *pcVar3 = '\0';
        pcVar3 = pcVar3 + 1;
      }
      if (pcVar2 != (char *)0x0) {
        strncpy((char *)(param_2 + 0x167e),pcVar2,0x7f9);
        *(undefined1 *)(param_2 + 0x1e76) = 0;
      }
      if (pcVar3 != (char *)0x0) {
        pcVar2 = strchr(pcVar3,0x3a);
        if (pcVar2 != (char *)0x0) {
          *pcVar2 = '\0';
          pcVar2 = pcVar2 + 1;
        }
        if (pcVar3 != (char *)0x0) {
          strncpy((char *)(param_2 + 0x1650),pcVar3,9);
          *(undefined1 *)(param_2 + 0x1658) = 0;
        }
        if (pcVar2 != (char *)0x0) {
          pcVar3 = strchr(pcVar2,0x3a);
          if (pcVar3 != (char *)0x0) {
            *pcVar3 = '\0';
            pcVar3 = pcVar3 + 1;
          }
          if (pcVar2 != (char *)0x0) {
            strncpy((char *)(param_2 + 0x1661),pcVar2,2);
            do {
              uVar4 = uVar4 + 1;
            } while (pcVar2[uVar4] != '\0');
            if (2 < uVar4) {
              strncpy((char *)(param_2 + 0x1659),pcVar2 + 3,8);
              *(undefined1 *)(param_2 + 0x1660) = 0;
            }
          }
          if (pcVar3 != (char *)0x0) {
            pcVar2 = strchr(pcVar3,0x3a);
            if (pcVar2 != (char *)0x0) {
              *pcVar2 = '\0';
            }
            if (pcVar3 != (char *)0x0) {
              strncpy(&DAT_00001e97 + param_2,pcVar3,0xc);
              *(undefined1 *)(param_2 + 0x1ea2) = 0;
              strncpy((char *)(param_2 + 0x1659),pcVar3 + 1,8);
              *(undefined1 *)(param_2 + 0x1660) = 0;
            }
          }
        }
      }
    }
  }
  return 0;
}
