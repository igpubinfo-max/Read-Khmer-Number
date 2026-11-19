package com.khmeramount.converter

import org.junit.Assert.assertEquals
import org.junit.Test

class KhmerAmountConverterTest {

    @Test
    fun testBasicNumbers() {
        assertEquals("សូន្យ", KhmerAmountConverter.convertBanking("0"))
        assertEquals("មួយ", KhmerAmountConverter.convertBanking("1"))
        assertEquals("ដប់", KhmerAmountConverter.convertBanking("10"))
        assertEquals("ម្ភៃមួយ", KhmerAmountConverter.convertBanking("21"))
        assertEquals("មួយរយប្រាំ", KhmerAmountConverter.convertBanking("105"))
        assertEquals("មួយរយម្ភៃប្រាំ", KhmerAmountConverter.convertBanking("125"))
        assertEquals("មួយពាន់", KhmerAmountConverter.convertBanking("1000"))
        assertEquals("មួយពាន់ប្រាំ", KhmerAmountConverter.convertBanking("1005"))
    }

    @Test
    fun testBankingVsTraditional() {
        // 50,000
        assertEquals("ហាសិបពាន់", KhmerAmountConverter.convertBanking("50000"))
        assertEquals("ប្រាំម៉ឺន", KhmerAmountConverter.convertTraditional("50000"))

        // 100,000
        assertEquals("មួយរយពាន់", KhmerAmountConverter.convertBanking("100000"))
        assertEquals("មួយសែន", KhmerAmountConverter.convertTraditional("100000"))

        // 500,000
        assertEquals("ប្រាំរយពាន់", KhmerAmountConverter.convertBanking("500000"))
        assertEquals("ប្រាំសែន", KhmerAmountConverter.convertTraditional("500000"))

        // 1,500,000
        assertEquals("មួយលានប្រាំរយពាន់", KhmerAmountConverter.convertBanking("1500000"))
        assertEquals("មួយលានប្រាំសែន", KhmerAmountConverter.convertTraditional("1500000"))
    }

    @Test
    fun testCurrencies() {
        val usdRes = KhmerAmountConverter.convert("125.50", currency = Currency.USD)
        assertEquals("មួយរយម្ភៃប្រាំដុល្លារនិងហាសិបសេន", usdRes.khmerWords)

        val khrRes = KhmerAmountConverter.convert("500000", currency = Currency.KHR, mode = ScaleMode.TRADITIONAL)
        assertEquals("ប្រាំសែនរៀលគត់", khrRes.khmerWords)

        val centsRes = KhmerAmountConverter.convert("0.25", currency = Currency.USD)
        assertEquals("ម្ភៃប្រាំសេន", centsRes.khmerWords)
    }

    @Test
    fun testKhmerDigits() {
        assertEquals("១,២៥០.៥០", KhmerAmountConverter.toKhmerDigits("1,250.50"))
        assertEquals("៥០០,០០០", KhmerAmountConverter.toKhmerDigits("500,000"))
    }
}
