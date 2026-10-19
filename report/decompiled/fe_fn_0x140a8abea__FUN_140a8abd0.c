/* ============================================================================
 *  Ghidra pseudocode (decompiled output) — NOT original source.
 *
 *  binary     : WolframNB.exe
 *  sha256     : (front end, SystemFiles\FrontEnd\Binaries\Windows-x86-64)
 *  function   : FUN_140a8abd0
 *  address    : 0x140a8abd0
 *  body       : 0x140a8abd0..0x140a8ad65
 *  signature  : undefined FUN_140a8abd0()
 *  provenance : REA Ghidra 12.1.4, operation "analyze_function"
 *
 *  Referenced strings:
   * 0x1414bf2a8  "Mathematica"
   * 0x1414e63e8  "DragGraphicsHighlightDirectH"
   * 0x1414e6bf8  "WolframFinancialFramework"
   * 0x1414e6c18  "WolframRaspberryPi"
   * 0x1414e6c30  "WolframAlphaNB"
   * 0x1414e6c40  "WolframFinancePlatform"
   * 0x1414e7400  "Sandbox"
   * 0x1414e7400  "Sandbox"
   * 0x1414e7400  "Sandbox"
   * 0x1414e7400  "Sandbox"
   * 0x1414e7400  "Sandbox"
   * 0x1414e7400  "Sandbox"
   * 0x1414e7400  "Sandbox"
   * 0x1414e7400  "Sandbox"
   * 0x1414e7438  "WolframPlayer"
   * 0x1414f7618  "WolframOne"
   * 0x141578820  "WolframPlayerPro"
 *
 *  Callees:
   * 0x1403754d0  FUN_1403754d0
   * 0x140409c90  FUN_140409c90
   * 0x140da32d0  FUN_140da32d0
   * 0x140f09670  FUN_140f09670
   * 0x140f3e270  FUN_140f3e270
 * ============================================================================
 */


void FUN_140a8abd0(longlong param_1)

{
  undefined8 uVar1;
  short sVar2;
  
  if (param_1 == 0) {
    uVar1 = FUN_140409c90();
    FUN_140f09670(uVar1);
    return;
  }
  param_1 = param_1 + 0x167e;
  sVar2 = FUN_140da32d0(param_1,&DAT_1414e7430);
  if (sVar2 != 0) {
    FUN_140f3e270("WolframAlphaNB",1);
    return;
  }
  sVar2 = FUN_140da32d0(param_1,&DAT_1414e7418);
  if (sVar2 != 0) {
    FUN_140f3e270("WolframFinancePlatform",1);
    return;
  }
  sVar2 = FUN_140da32d0(param_1,&DAT_1414e7414);
  if (sVar2 != 0) {
    FUN_140f3e270("WolframOne",1);
    return;
  }
  sVar2 = FUN_140da32d0(param_1,&DAT_1414e740c);
  if (sVar2 != 0) {
    FUN_140f3e270("Mathematica",1);
    return;
  }
  sVar2 = FUN_140da32d0(param_1,&DAT_1414e7410);
  if (sVar2 != 0) {
    FUN_140f3e270("WolframFinancialFramework",1);
    return;
  }
  sVar2 = FUN_140da32d0(param_1,&DAT_1414e64e4);
  if (sVar2 != 0) {
    FUN_140f3e270("WolframRaspberryPi",1);
    return;
  }
  sVar2 = FUN_140da32d0(param_1,&DAT_1414e7408);
  if (sVar2 != 0) {
    FUN_140f3e270("WolframPlayerPro",1);
    return;
  }
  sVar2 = FUN_140da32d0(param_1,&DAT_1414e7434);
  if (sVar2 != 0) {
    FUN_140f3e270("WolframPlayer",1);
    return;
  }
  uVar1 = FUN_1403754d0();
  FUN_140f3e270(uVar1,1);
  return;
}
