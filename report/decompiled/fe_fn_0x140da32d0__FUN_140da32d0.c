/* ============================================================================
 *  Ghidra pseudocode (decompiled output) — NOT original source.
 *
 *  binary     : WolframNB.exe
 *  sha256     : (front end, SystemFiles\FrontEnd\Binaries\Windows-x86-64)
 *  function   : FUN_140da32d0
 *  address    : 0x140da32d0
 *  body       : 0x140da32d0..0x140da335d
 *  signature  : undefined FUN_140da32d0()
 *  provenance : REA Ghidra 12.1.4, operation "analyze_function"
 *
 *  Referenced strings:
   * (none)
 *
 *  Callees:
   * EXTERNAL:0x3b4  API-MS-WIN-CRT-CONVERT-L1-1-0.DLL::atoi
   * 0x1401a5600  FUN_1401a5600
 * ============================================================================
 */


bool FUN_140da32d0(longlong param_1,char *param_2)

{
  uint uVar1;
  longlong lVar2;
  uint local_res18 [4];
  
  uVar1 = atoi(param_2);
  lVar2 = -1;
  do {
    lVar2 = lVar2 + 1;
  } while (*(char *)(param_1 + lVar2) != '\0');
  if (1 - (int)(((double)(int)uVar1 + 0.5) * -0.25) <= (int)lVar2) {
    FUN_1401a5600(param_1,&DAT_1414ede78,local_res18);
    return (local_res18[0] >> (uVar1 & 0x1f) & 1) != 0;
  }
  return false;
}
