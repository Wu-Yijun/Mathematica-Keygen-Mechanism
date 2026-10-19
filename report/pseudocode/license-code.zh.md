# 伪代码 — `LicenseCode`（产品 / 类别 / 特性）

**中文** · [English](license-code.md)

## 谓词   （对应 FUN_140da32d0）

```
function license_code_has_bit(code, licenseCode):
    bit = atoi(code)                                  # code is the BIT INDEX, e.g. "23"
    if hex_length_for(bit) > length(licenseCode): return false
    n = parse_number(licenseCode)                     # LicenseCode parsed as a number
    return (n >> (bit & 31)) & 1
```

## 产品   （对应 FUN_140a8abd0）

```
function product_of(licenseCode):                     # -> ProductIDName
    if license_code_has_bit("20", licenseCode): return "WolframAlphaNB"
    if license_code_has_bit("22", licenseCode): return "WolframFinancePlatform"
    if license_code_has_bit("21", licenseCode): return "WolframOne"
    if license_code_has_bit("23", licenseCode): return "Mathematica"
    if license_code_has_bit("24", licenseCode): return "WolframFinancialFramework"
    if license_code_has_bit("26", licenseCode): return "WolframRaspberryPi"
    if license_code_has_bit("6",  licenseCode): return "WolframPlayerPro"
    if license_code_has_bit("5",  licenseCode): return "WolframPlayer"
    return default_product_id_name()                  # env/registry or "Wolfram"
```

## 许可证类别   （对应 FUN_140a8ad70）

```
function class_of(licenseCode):
    if license_code_has_bit("1",  licenseCode): return "Trial"
    if license_code_has_bit("2",  licenseCode): return "Student"
    if license_code_has_bit("3",  licenseCode): return "Site"
    if license_code_has_bit("11", licenseCode): return "Home"
    return "Professional"
```

## 能力   （对应 FUN_140a8b0e0）

```
function capabilities_of(licenseCode):
    caps = []
    if license_code_has_bit("13", licenseCode): caps += "EnterpriseSigning"
    if license_code_has_bit("19", licenseCode): caps += "AltExpirationPolicy"
    if license_code_has_bit("29", licenseCode): caps += "AutoRenewingSubscription"
    if NOT license_code_has_bit("28", licenseCode): caps += "LLMSupport"
    return caps
```

## 下游

```
product      -> ProductIDName  -> PacletManager`Package`getProductID[]
                                -> matches shell paclet "ProductID"
                                -> loads that product's shell (menus, branding, welcome screen)
class        -> System`$LicenseType and the licence-type UI bar (Trial/Home/Student/Player)
capabilities -> feature flags
```
