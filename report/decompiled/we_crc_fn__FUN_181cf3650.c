/* ============================================================================
 *  Ghidra pseudocode (decompiled output) — NOT original source.
 *
 *  binary     : WolframEngine.dll
 *  sha256     : 9a9a7d88d1a9285bc792e885cf589374285b1a247116eb3bfaefb2f71d2bad6f
 *  function   : FUN_181cf3650
 *  address    : 0x181cf3650
 *  body       : 0x181cf3650..0x181cf3d4f
 *  signature  : undefined FUN_181cf3650()
 *  provenance : REA Ghidra 12.1.4, operation "analyze_function"
 *
 *  Referenced strings:
   * 0x185c58200  "Bad password."
 *
 *  Callees:
   * 0x181cf3fa0  FUN_181cf3fa0
 * ============================================================================
 */


char * FUN_181cf3650(char *param_1,uint param_2,uint param_3)

{
  char cVar1;
  bool bVar2;
  char *pcVar3;
  uint uVar4;
  uint *puVar5;
  uint uVar6;
  uint uVar7;
  uint uVar8;
  undefined4 local_res8 [2];
  
  bVar2 = false;
  local_res8[0] = 0;
  uVar4 = (param_3 >> 0xe & 1) + ((param_3 >> 0xf & 1) + 0x14b6c ^ 0x1064b) * 2;
  uVar6 = (param_3 >> 0xd & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (param_3 >> 0xb & 1) + ((param_3 >> 0xc & 1) + uVar6 * 2) * 2;
  uVar6 = (param_3 >> 10 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (param_3 >> 9 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (param_3 >> 8 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (param_3 >> 7 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (param_3 >> 6 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (param_3 >> 5 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (param_3 >> 4 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (param_3 >> 3 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (param_3 >> 2 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (param_3 >> 1 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (param_3 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  cVar1 = *param_1;
  pcVar3 = param_1;
  while (cVar1 != '\0') {
    uVar7 = (uint)cVar1;
    pcVar3 = pcVar3 + 1;
    uVar4 = (uVar7 >> 7 & 1) + uVar6 * 2;
    if ((uVar6 >> 0xf & 1) != 0) {
      uVar4 = uVar4 ^ 0x1064b;
    }
    uVar6 = (uVar7 >> 6 & 1) + uVar4 * 2;
    if ((uVar4 >> 0xf & 1) != 0) {
      uVar6 = uVar6 ^ 0x1064b;
    }
    uVar4 = (uVar7 >> 5 & 1) + uVar6 * 2;
    if ((uVar6 >> 0xf & 1) != 0) {
      uVar4 = uVar4 ^ 0x1064b;
    }
    uVar6 = (uVar7 >> 4 & 1) + uVar4 * 2;
    if ((uVar4 >> 0xf & 1) != 0) {
      uVar6 = uVar6 ^ 0x1064b;
    }
    uVar4 = (uVar7 >> 3 & 1) + uVar6 * 2;
    if ((uVar6 >> 0xf & 1) != 0) {
      uVar4 = uVar4 ^ 0x1064b;
    }
    uVar6 = (uVar7 >> 2 & 1) + uVar4 * 2;
    if ((uVar4 >> 0xf & 1) != 0) {
      uVar6 = uVar6 ^ 0x1064b;
    }
    uVar4 = (uVar7 >> 1 & 1) + uVar6 * 2;
    if ((uVar6 >> 0xf & 1) != 0) {
      uVar4 = uVar4 ^ 0x1064b;
    }
    uVar6 = (uVar7 & 1) + uVar4 * 2;
    if ((uVar4 >> 0xf & 1) != 0) {
      uVar6 = uVar6 ^ 0x1064b;
    }
    cVar1 = *pcVar3;
  }
  uVar7 = FUN_181cf3fa0(param_2,local_res8);
  uVar4 = (uVar7 >> 0xf & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (uVar7 >> 0xe & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (uVar7 >> 0xd & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (uVar7 >> 0xc & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (uVar7 >> 0xb & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (uVar7 >> 10 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (uVar7 >> 9 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (uVar7 >> 8 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar7 = FUN_181cf3fa0(param_2,local_res8);
  uVar4 = (uVar7 >> 7 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (uVar7 >> 6 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (uVar7 >> 5 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (uVar7 >> 4 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (uVar7 >> 3 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (uVar7 >> 2 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (uVar7 >> 1 & 1) + uVar6 * 2;
  if ((uVar6 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x1064b;
  }
  uVar6 = (uVar7 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar6 = uVar6 ^ 0x1064b;
  }
  uVar4 = (param_2 >> 0xe & 1) + ((param_2 >> 0xf & 1) + 0x14b6c ^ 0x105c3) * 2;
  uVar7 = (param_2 >> 0xd & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar7 = uVar7 ^ 0x105c3;
  }
  uVar4 = (param_2 >> 0xb & 1) + ((param_2 >> 0xc & 1) + uVar7 * 2) * 2;
  uVar7 = (param_2 >> 10 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar7 = uVar7 ^ 0x105c3;
  }
  uVar4 = (param_2 >> 9 & 1) + uVar7 * 2;
  if ((uVar7 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x105c3;
  }
  uVar7 = (param_2 >> 8 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar7 = uVar7 ^ 0x105c3;
  }
  uVar4 = (param_2 >> 7 & 1) + uVar7 * 2;
  if ((uVar7 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x105c3;
  }
  uVar7 = (param_2 >> 6 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar7 = uVar7 ^ 0x105c3;
  }
  uVar4 = (param_2 >> 5 & 1) + uVar7 * 2;
  if ((uVar7 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x105c3;
  }
  uVar7 = (param_2 >> 4 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar7 = uVar7 ^ 0x105c3;
  }
  uVar4 = (param_2 >> 3 & 1) + uVar7 * 2;
  if ((uVar7 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x105c3;
  }
  uVar7 = (param_2 >> 2 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar7 = uVar7 ^ 0x105c3;
  }
  uVar4 = (param_2 >> 1 & 1) + uVar7 * 2;
  if ((uVar7 >> 0xf & 1) != 0) {
    uVar4 = uVar4 ^ 0x105c3;
  }
  uVar7 = (param_2 & 1) + uVar4 * 2;
  if ((uVar4 >> 0xf & 1) != 0) {
    uVar7 = uVar7 ^ 0x105c3;
  }
  cVar1 = *param_1;
  while (cVar1 != '\0') {
    uVar8 = (uint)cVar1;
    param_1 = param_1 + 1;
    uVar4 = (uVar8 >> 7 & 1) + uVar7 * 2;
    if ((uVar7 >> 0xf & 1) != 0) {
      uVar4 = uVar4 ^ 0x105c3;
    }
    uVar7 = (uVar8 >> 6 & 1) + uVar4 * 2;
    if ((uVar4 >> 0xf & 1) != 0) {
      uVar7 = uVar7 ^ 0x105c3;
    }
    uVar4 = (uVar8 >> 5 & 1) + uVar7 * 2;
    if ((uVar7 >> 0xf & 1) != 0) {
      uVar4 = uVar4 ^ 0x105c3;
    }
    uVar7 = (uVar8 >> 4 & 1) + uVar4 * 2;
    if ((uVar4 >> 0xf & 1) != 0) {
      uVar7 = uVar7 ^ 0x105c3;
    }
    uVar4 = (uVar8 >> 3 & 1) + uVar7 * 2;
    if ((uVar7 >> 0xf & 1) != 0) {
      uVar4 = uVar4 ^ 0x105c3;
    }
    uVar7 = (uVar8 >> 2 & 1) + uVar4 * 2;
    if ((uVar4 >> 0xf & 1) != 0) {
      uVar7 = uVar7 ^ 0x105c3;
    }
    uVar4 = (uVar8 >> 1 & 1) + uVar7 * 2;
    if ((uVar7 >> 0xf & 1) != 0) {
      uVar4 = uVar4 ^ 0x105c3;
    }
    uVar7 = (uVar8 & 1) + uVar4 * 2;
    if ((uVar4 >> 0xf & 1) != 0) {
      uVar7 = uVar7 ^ 0x105c3;
    }
    cVar1 = *param_1;
  }
  if (0 < DAT_186d4dd94) {
    puVar5 = &DAT_186d4dd40;
    pcVar3 = (char *)0x0;
    do {
      if (*puVar5 == uVar7) goto LAB_181cf3d29;
      uVar4 = (int)pcVar3 + 1;
      pcVar3 = (char *)(ulonglong)uVar4;
      puVar5 = puVar5 + 1;
    } while ((int)uVar4 < DAT_186d4dd94);
  }
  bVar2 = true;
LAB_181cf3d29:
  pcVar3 = "Bad password.";
  if (uVar6 == 0 && !bVar2) {
    pcVar3 = (char *)0x0;
  }
  return pcVar3;
}
