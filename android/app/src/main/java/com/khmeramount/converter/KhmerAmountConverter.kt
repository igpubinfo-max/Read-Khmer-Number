package com.khmeramount.converter

import java.math.BigInteger

enum class Currency(val code: String, val symbol: String, val khmerName: String, val subunitName: String) {
    USD("USD", "$", "ដុល្លារ", "សេន"),
    KHR("KHR", "៛", "រៀល", ""),
    THB("THB", "฿", "បាត", "ស្តាង្គ"),
    NONE("NONE", "", "", "")
}

enum class ScaleMode {
    BANKING,    // Groups of 3 digits: ពាន់, លាន, ពាន់លាន, ទ្រីលាន
    TRADITIONAL // Traditional Khmer scale: ម៉ឺន, សែន, លាន
}

data class ConversionResult(
    val khmerWords: String,
    val khmerDigits: String,
    val formattedNumber: String,
    val currencySymbol: String
)

object KhmerAmountConverter {
    val DIGITS = arrayOf("សូន្យ", "មួយ", "ពីរ", "បី", "បួន", "ប្រាំ", "ប្រាំមួយ", "ប្រាំពីរ", "ប្រាំបី", "ប្រាំបួន")
    val TENS = arrayOf("", "ដប់", "ម្ភៃ", "សាមសិប", "សែសិប", "ហាសិប", "ហុកសិប", "ចិតសិប", "ប៉ែតសិប", "កៅសិប")
    val BANK_SCALES = arrayOf("", "ពាន់", "លាន", "ពាន់លាន", "ទ្រីលាន", "ពាន់ទ្រីលាន")
    val TRAD_POS = arrayOf("", "", "រយ", "ពាន់", "ម៉ឺន", "សែន", "លាន")
    val KM_NUMBERS = arrayOf('០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩')

    fun toKhmerDigits(str: String): String {
        val sb = StringBuilder()
        for (ch in str) {
            if (ch in '0'..'9') {
                sb.append(KM_NUMBERS[ch - '0'])
            } else {
                sb.append(ch)
            }
        }
        return sb.toString()
    }

    fun convertUnder1000(n: Int, withSpaces: Boolean = false): String {
        val sep = if (withSpaces) " " else ""
        val parts = mutableListOf<String>()
        val hundreds = n / 100
        val remainder = n % 100

        if (hundreds > 0) {
            parts.add(DIGITS[hundreds] + (if (withSpaces) " " else "") + "រយ")
        }

        if (remainder > 0) {
            val tens = remainder / 10
            val units = remainder % 10
            if (tens > 0) {
                parts.add(TENS[tens])
                if (units > 0) {
                    parts.add(DIGITS[units])
                }
            } else {
                parts.add(DIGITS[units])
            }
        }
        return parts.joinToString(sep)
    }

    fun convertBanking(intStrInput: String, withSpaces: Boolean = false): String {
        val intStr = intStrInput.replaceFirst("^0+".toRegex(), "")
        if (intStr.isEmpty()) return DIGITS[0]

        val sep = if (withSpaces) " " else ""
        val groups = mutableListOf<Int>()
        var s = intStr
        while (s.isNotEmpty()) {
            val start = maxOf(0, s.length - 3)
            groups.add(s.substring(start).toIntOrNull() ?: 0)
            s = s.substring(0, start)
        }

        val result = mutableListOf<String>()
        for (i in groups.indices.reversed()) {
            val g = groups[i]
            if (g > 0) {
                val words = convertUnder1000(g, withSpaces)
                val scale = if (i < BANK_SCALES.size) BANK_SCALES[i] else ""
                val combined = if (scale.isNotEmpty()) {
                    words + (if (withSpaces) " " else "") + scale
                } else {
                    words
                }
                result.add(combined)
            }
        }
        return if (result.isNotEmpty()) result.joinToString(sep) else DIGITS[0]
    }

    private fun convertUnderMillionTrad(intStrInput: String, withSpaces: Boolean = false): String {
        val intStr = intStrInput.replaceFirst("^0+".toRegex(), "")
        if (intStr.isEmpty()) return ""
        val sep = if (withSpaces) " " else ""
        val digits = intStr.map { it - '0' }
        val len = digits.size
        val parts = mutableListOf<String>()

        for (i in digits.indices) {
            val d = digits[i]
            val pos = len - 1 - i
            if (d == 0) continue

            when (pos) {
                1 -> parts.add(TENS[d])
                0 -> parts.add(DIGITS[d])
                else -> {
                    val posName = if (pos < TRAD_POS.size) TRAD_POS[pos] else ""
                    parts.add(DIGITS[d] + (if (withSpaces) " " else "") + posName)
                }
            }
        }
        return parts.joinToString(sep)
    }

    fun convertTraditional(intStrInput: String, withSpaces: Boolean = false): String {
        val intStr = intStrInput.replaceFirst("^0+".toRegex(), "")
        if (intStr.isEmpty()) return DIGITS[0]
        val sep = if (withSpaces) " " else ""

        if (intStr.length <= 6) {
            val res = convertUnderMillionTrad(intStr, withSpaces)
            return if (res.isNotEmpty()) res else DIGITS[0]
        }

        val millions = intStr.substring(0, intStr.length - 6)
        val remainder = intStr.substring(intStr.length - 6)

        val millWords = convertTraditional(millions, withSpaces) + (if (withSpaces) " " else "") + "លាន"
        val remWords = convertUnderMillionTrad(remainder, withSpaces)
        return if (remWords.isNotEmpty()) "$millWords$sep$remWords" else millWords
    }

    fun convert(
        amountInput: String,
        currency: Currency = Currency.USD,
        mode: ScaleMode = ScaleMode.BANKING,
        withSpaces: Boolean = false,
        useExactKot: Boolean = true
    ): ConversionResult {
        val clean = amountInput.replace(",", "").trim()
        if (clean.isEmpty()) {
            return ConversionResult("", "", "", currency.symbol)
        }

        val parts = clean.split(".")
        val intPart = parts.getOrNull(0) ?: "0"
        val fracPart = parts.getOrNull(1) ?: ""

        val toWords: (String) -> String = { str ->
            if (mode == ScaleMode.TRADITIONAL) {
                convertTraditional(str, withSpaces)
            } else {
                convertBanking(str, withSpaces)
            }
        }

        val sep = if (withSpaces) " " else ""
        val intNum = try { BigInteger(intPart) } catch (e: Exception) { BigInteger.ZERO }
        val intWords = toWords(intPart)
        var resultWords = ""

        when (currency) {
            Currency.KHR -> {
                resultWords = intWords + sep + currency.khmerName
                if (useExactKot && (fracPart.isEmpty() || fracPart.toIntOrNull() == 0)) {
                    resultWords += sep + "គត់"
                }
            }
            Currency.USD, Currency.THB -> {
                val fracStr = when {
                    fracPart.length == 1 -> fracPart + "0"
                    fracPart.length >= 2 -> fracPart.substring(0, 2)
                    else -> "00"
                }
                val centsNum = fracStr.toIntOrNull() ?: 0

                if (intNum == BigInteger.ZERO && centsNum > 0) {
                    resultWords = toWords(centsNum.toString()) + sep + currency.subunitName
                } else {
                    resultWords = intWords + sep + currency.khmerName
                    if (centsNum > 0) {
                        resultWords += sep + "និង" + sep + toWords(centsNum.toString()) + sep + currency.subunitName
                    } else if (useExactKot) {
                        resultWords += sep + "គត់"
                    }
                }
            }
            Currency.NONE -> {
                resultWords = intWords
                if (fracPart.isNotEmpty() && (fracPart.toIntOrNull() ?: 0) > 0) {
                    val fracWords = fracPart.map { ch ->
                        val d = ch - '0'
                        if (d in 0..9) DIGITS[d] else ""
                    }.joinToString(sep)
                    resultWords += sep + "ចុច" + sep + fracWords
                }
            }
        }

        val formattedNum = formatNumberWithCommas(clean)
        val khmerDigits = toKhmerDigits(formattedNum)
        val displayDigits = if (currency.symbol.isNotEmpty()) "${currency.symbol} $khmerDigits" else khmerDigits
        val displayFormatted = if (currency.symbol.isNotEmpty()) "${currency.symbol} $formattedNum" else formattedNum

        return ConversionResult(
            khmerWords = resultWords.trim(),
            khmerDigits = displayDigits,
            formattedNumber = displayFormatted,
            currencySymbol = currency.symbol
        )
    }

    private fun formatNumberWithCommas(numStr: String): String {
        val parts = numStr.split(".")
        val intPart = parts[0].reversed().chunked(3).joinToString(",").reversed()
        return if (parts.size > 1) "$intPart.${parts[1]}" else intPart
    }
}
