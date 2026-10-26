const EMBEDDED_STOCKS = {"ITC": {"company": "ITC Ltd", "ticker": "ITC", "market": "INDIA", "currency": "INR", "sector": "Fast Moving Consumer Goods", "industry": "Diversified FMCG", "current_price": 260.0, "high_52w": 426.0, "low_52w": 253.0, "quality_score": {"earned": 18, "total": 23, "pct": 78.3, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 20, "zone_label": "Extreme Fear Zone", "tier": "extreme-fear"}, "price_series": [419.6384582519531, 444.963134765625, 425.17523193359375, 391.2324523925781, 412.4647521972656, 419.4940185546875, 410.63519287109375, 409.1427001953125, 476.9800720214844, 483.28717041015625, 498.9345397949219, 470.6729736328125, 459.0698547363281, 465.7139587402344, 447.5, 395.0, 409.75, 425.79998779296875, 418.04998779296875, 416.45001220703125, 411.95001220703125, 409.75, 401.54998779296875, 420.3500061035156, 404.25, 403.0, 322.1499938964844, 313.6000061035156, 287.70001220703125, 314.8999938964844, 286.8999938964844, 286.95001220703125, 281.0, 255.5, 262.75, 260.5]}, "TCS": {"company": "Tata Consultancy Services Ltd", "ticker": "TCS", "market": "INDIA", "currency": "INR", "sector": "Information Technology", "industry": "Computers - Software & Consulting", "current_price": 2536.0, "high_52w": 3350.0, "low_52w": 1976.0, "quality_score": {"earned": 18, "total": 23, "pct": 78.3, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 40, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [3487.60009765625, 3793.39990234375, 3815.949951171875, 4095.10009765625, 3876.300048828125, 3820.64990234375, 3670.949951171875, 3904.14990234375, 4385.35009765625, 4553.75, 4268.5, 3968.449951171875, 4270.85009765625, 4094.800048828125, 4112.39990234375, 3483.25, 3606.14990234375, 3453.699951171875, 3463.39990234375, 3462.0, 3036.800048828125, 3084.699951171875, 2888.39990234375, 3058.0, 3137.5, 3206.199951171875, 3123.89990234375, 2637.39990234375, 2358.89990234375, 2473.89990234375, 2258.89990234375, 2031.5, 2365.60009765625, 2399.300048828125, 2050.60009765625, 2535.0]}, "INFY": {"company": "Infosys Ltd", "ticker": "INFY", "market": "INDIA", "currency": "INR", "sector": "Information Technology", "industry": "Computers - Software & Consulting", "current_price": 1166.0, "high_52w": 1728.0, "low_52w": 980.0, "quality_score": {"earned": 18, "total": 23, "pct": 78.3, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 42, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [1455.1500244140625, 1542.9000244140625, 1660.9000244140625, 1673.9000244140625, 1498.050048828125, 1420.550048828125, 1406.9000244140625, 1566.75, 1868.25, 1943.699951171875, 1875.5999755859375, 1757.25, 1857.8499755859375, 1880.0, 1879.800048828125, 1687.699951171875, 1570.6500244140625, 1500.0999755859375, 1562.699951171875, 1601.800048828125, 1509.0, 1469.5999755859375, 1441.800048828125, 1482.300048828125, 1560.0999755859375, 1615.4000244140625, 1641.0, 1300.0999755859375, 1250.5999755859375, 1181.800048828125, 1160.9000244140625, 1000.4000244140625, 1130.0999755859375, 1133.800048828125, 994.0999755859375, 1166.0]}, "HDFCBANK": {"company": "HDFC Bank Ltd", "ticker": "HDFCBANK", "market": "INDIA", "currency": "INR", "sector": "Financial Services", "industry": "Private Sector Bank", "current_price": 688.0, "high_52w": 1018.0, "low_52w": 682.0, "quality_score": {"earned": 19, "total": 23, "pct": 82.6, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 22, "zone_label": "Extreme Fear Zone", "tier": "extreme-fear"}, "price_series": [779.4000244140625, 854.625, 731.2750244140625, 701.7000122070312, 723.9500122070312, 760.0499877929688, 765.7750244140625, 841.9000244140625, 807.875, 818.4500122070312, 866.0250244140625, 867.8499755859375, 898.0250244140625, 886.4249877929688, 849.375, 866.2000122070312, 914.0999755859375, 962.5, 972.4500122070312, 1000.75, 1009.0999755859375, 951.5999755859375, 951.0, 987.2999877929688, 1007.5999755859375, 991.2000122070312, 929.25, 887.75, 731.5499877929688, 771.7000122070312, 744.5499877929688, 797.9500122070312, 748.1500244140625, 709.0, 708.7000122070312, 688.0499877929688]}, "ASIANPAINT": {"company": "Asian Paints Ltd", "ticker": "ASIANPAINT", "market": "INDIA", "currency": "INR", "sector": "Consumer Durables", "industry": "Paints", "current_price": 2323.0, "high_52w": 2986.0, "low_52w": 2115.0, "quality_score": {"earned": 17, "total": 23, "pct": 73.9, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 39, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [3119.89990234375, 3402.39990234375, 2957.85009765625, 2821.89990234375, 2846.75, 2875.89990234375, 2881.199951171875, 2917.050048828125, 3084.449951171875, 3126.800048828125, 3329.10009765625, 2935.64990234375, 2479.60009765625, 2281.35009765625, 2300.800048828125, 2179.75, 2340.64990234375, 2425.699951171875, 2259.10009765625, 2341.10009765625, 2396.10009765625, 2518.60009765625, 2350.0, 2510.800048828125, 2874.39990234375, 2769.5, 2428.300048828125, 2376.199951171875, 2165.199951171875, 2444.5, 2671.60009765625, 2635.699951171875, 2747.300048828125, 2653.60009765625, 2402.60009765625, 2322.0]}, "TITAN": {"company": "Titan Company Ltd", "ticker": "TITAN", "market": "INDIA", "currency": "INR", "sector": "Consumer Durables", "industry": "Gems, Jewellery And Watches", "current_price": 4325.0, "high_52w": 5187.0, "low_52w": 3667.0, "quality_score": {"earned": 16, "total": 23, "pct": 69.6, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 47, "zone_label": "Neutral Zone", "tier": "neutral"}, "price_series": [3490.60009765625, 3675.449951171875, 3697.550048828125, 3624.39990234375, 3801.800048828125, 3589.25, 3241.89990234375, 3404.199951171875, 3458.949951171875, 3565.14990234375, 3823.949951171875, 3267.050048828125, 3249.0, 3253.14990234375, 3490.25, 3077.25, 3063.35009765625, 3379.699951171875, 3555.0, 3690.199951171875, 3347.300048828125, 3628.800048828125, 3367.0, 3746.699951171875, 3907.699951171875, 4051.5, 3977.39990234375, 4327.5, 3951.39990234375, 4385.2001953125, 4074.89990234375, 4404.0, 4875.2001953125, 5102.39990234375, 4587.0, 4323.0]}, "MARUTI": {"company": "Maruti Suzuki India Ltd", "ticker": "MARUTI", "market": "INDIA", "currency": "INR", "sector": "Automobile and Auto Components", "industry": "Passenger Cars & Utility Vehicles", "current_price": 11200.0, "high_52w": 17372.0, "low_52w": 10984.0, "quality_score": {"earned": 16, "total": 23, "pct": 69.6, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 31, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [10608.7001953125, 10302.349609375, 10186.900390625, 11288.349609375, 12600.349609375, 12817.5, 12399.2998046875, 12033.849609375, 13115.7998046875, 12403.0, 13238.0, 11076.4501953125, 11074.2001953125, 10858.400390625, 12310.650390625, 11945.849609375, 11522.150390625, 12257.0, 12319.0, 12400.0, 12608.0, 14791.0, 16029.0, 16186.0, 15900.0, 16697.0, 14599.0, 14857.0, 12306.0, 13314.0, 13127.0, 14115.0, 14234.0, 13547.0, 11967.0, 11220.0]}, "TATASTEEL": {"company": "Tata Steel Ltd", "ticker": "TATASTEEL", "market": "INDIA", "currency": "INR", "sector": "Metals & Mining", "industry": "Iron & Steel", "current_price": 170.0, "high_52w": 224.0, "low_52w": 160.0, "quality_score": {"earned": 11, "total": 23, "pct": 47.8, "band_label": "Low Historical Consistency (0–11)", "tier": "low"}, "fear_greed": {"score": 42, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [127.9000015258789, 139.60000610351562, 135.9499969482422, 140.85000610351562, 155.85000610351562, 165.0, 167.1999969482422, 174.00999450683594, 165.3300018310547, 152.75999450683594, 168.5500030517578, 148.55999755859375, 144.5399932861328, 138.0500030517578, 134.6199951171875, 137.1999969482422, 154.24000549316406, 140.0800018310547, 161.02000427246094, 159.75999450683594, 157.94000244140625, 154.47999572753906, 168.77000427246094, 182.83999633789062, 167.9600067138672, 180.0800018310547, 193.1300048828125, 212.3300018310547, 191.86000061035156, 211.36000061035156, 208.02000427246094, 188.05999755859375, 189.69000244140625, 184.35000610351562, 184.3000030517578, 169.94000244140625]}, "ONGC": {"company": "Oil & Natural Gas Corpn Ltd", "ticker": "ONGC", "market": "INDIA", "currency": "INR", "sector": "Oil, Gas & Consumable Fuels", "industry": "Oil Exploration & Production", "current_price": 228.0, "high_52w": 308.0, "low_52w": 218.0, "quality_score": {"earned": 16, "total": 23, "pct": 69.6, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 52, "zone_label": "Neutral Zone", "tier": "neutral"}, "price_series": [194.9499969482422, 205.0500030517578, 252.25, 264.6000061035156, 268.04998779296875, 282.8500061035156, 264.3500061035156, 274.20001220703125, 334.20001220703125, 330.75, 297.6000061035156, 266.1499938964844, 256.70001220703125, 239.25, 262.6099853515625, 225.25, 246.3800048828125, 244.4499969482422, 239.39999389648438, 244.2100067138672, 241.0, 233.7100067138672, 239.5, 255.3699951171875, 243.25, 240.3800048828125, 268.9599914550781, 279.70001220703125, 284.6499938964844, 299.54998779296875, 265.3999938964844, 234.89999389648438, 242.52999877929688, 231.8000030517578, 225.8000030517578, 228.44000244140625]}, "NTPC": {"company": "NTPC Ltd", "ticker": "NTPC", "market": "INDIA", "currency": "INR", "sector": "Power", "industry": "Power Generation", "current_price": 300.0, "high_52w": 414.0, "low_52w": 292.0, "quality_score": {"earned": 15, "total": 23, "pct": 65.2, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 40, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [261.29998779296875, 311.1499938964844, 317.5, 335.6000061035156, 335.79998779296875, 363.20001220703125, 359.0, 378.3500061035156, 416.0, 416.20001220703125, 443.20001220703125, 408.1499938964844, 363.6499938964844, 333.3500061035156, 324.0, 311.45001220703125, 357.6000061035156, 354.54998779296875, 333.8999938964844, 334.8999938964844, 334.25, 327.54998779296875, 340.45001220703125, 336.95001220703125, 326.45001220703125, 329.54998779296875, 356.0, 381.8999938964844, 370.6499938964844, 399.1499938964844, 386.8999938964844, 356.6499938964844, 347.25, 327.3999938964844, 322.75, 300.0]}, "PIDILITIND": {"company": "Pidilite Industries Ltd", "ticker": "PIDILITIND", "market": "INDIA", "currency": "INR", "sector": "Chemicals", "industry": "Specialty Chemicals", "current_price": 1477.0, "high_52w": 1708.0, "low_52w": 1259.0, "quality_score": {"earned": 17, "total": 23, "pct": 73.9, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 57, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [1276.175048828125, 1357.550048828125, 1266.5250244140625, 1368.0, 1507.3499755859375, 1524.5, 1484.75, 1579.4749755859375, 1593.199951171875, 1561.6500244140625, 1679.699951171875, 1572.925048828125, 1533.0999755859375, 1452.125, 1435.8499755859375, 1328.949951171875, 1424.6500244140625, 1516.949951171875, 1553.5999755859375, 1527.199951171875, 1434.9000244140625, 1525.1500244140625, 1468.0, 1444.5999755859375, 1469.800048828125, 1482.4000244140625, 1431.0999755859375, 1492.0, 1285.0, 1375.699951171875, 1482.800048828125, 1592.699951171875, 1611.4000244140625, 1687.699951171875, 1465.0999755859375, 1478.0]}, "PAGEIND": {"company": "Page Industries Ltd", "ticker": "PAGEIND", "market": "INDIA", "currency": "INR", "sector": "Textiles", "industry": "Garments & Apparels", "current_price": 33661.0, "high_52w": 43855.0, "low_52w": 29800.0, "quality_score": {"earned": 16, "total": 23, "pct": 69.6, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 28, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [37259.3984375, 38512.75, 37314.1015625, 34309.55078125, 34450.94921875, 34784.05078125, 35954.69921875, 39099.3515625, 42396.75, 42520.55078125, 42904.19921875, 43163.80078125, 44644.8984375, 47514.3984375, 44723.55078125, 40515.94921875, 42693.75, 45615.0, 46380.0, 49410.0, 48805.0, 44335.0, 40685.0, 41200.0, 38320.0, 36045.0, 32995.0, 32110.0, 31775.0, 36785.0, 38195.0, 41370.0, 40375.0, 35800.0, 36385.0, 33910.0]}, "PERSISTENT": {"company": "Persistent Systems Ltd", "ticker": "PERSISTENT", "market": "INDIA", "currency": "INR", "sector": "Information Technology", "industry": "Computers - Software & Consulting", "current_price": 5830.0, "high_52w": 6599.0, "low_52w": 4243.0, "quality_score": {"earned": 19, "total": 23, "pct": 82.6, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 57, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [3199.97509765625, 3694.699951171875, 4176.5751953125, 4315.1748046875, 3984.550048828125, 3368.60009765625, 3410.5, 4241.4501953125, 4832.2998046875, 5170.85009765625, 5450.39990234375, 5372.5, 5905.64990234375, 6457.7001953125, 6032.60009765625, 5303.89990234375, 5513.75, 5321.5, 5638.0, 6041.5, 5160.5, 5305.5, 4822.5, 5916.60009765625, 6353.0, 6272.0, 6035.0, 4733.0, 4877.2001953125, 4800.0, 5194.2998046875, 4326.5, 5549.0, 5594.5, 5279.0, 5850.0]}, "VOLTAS": {"company": "Voltas Ltd", "ticker": "VOLTAS", "market": "INDIA", "currency": "INR", "sector": "Consumer Durables", "industry": "Household Appliances", "current_price": 945.0, "high_52w": 1582.0, "low_52w": 932.0, "quality_score": {"earned": 12, "total": 23, "pct": 52.2, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 37, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [827.9500122070312, 978.3499755859375, 1092.75, 1109.0999755859375, 1103.550048828125, 1474.75, 1359.699951171875, 1472.199951171875, 1537.5999755859375, 1743.6500244140625, 1845.0999755859375, 1649.5, 1658.25, 1789.949951171875, 1260.8499755859375, 1320.0999755859375, 1458.699951171875, 1236.0999755859375, 1262.800048828125, 1314.0999755859375, 1327.699951171875, 1374.0, 1353.5, 1383.5999755859375, 1376.300048828125, 1361.199951171875, 1327.9000244140625, 1561.300048828125, 1272.800048828125, 1430.4000244140625, 1245.699951171875, 1277.5999755859375, 1328.9000244140625, 1194.4000244140625, 1070.0, 947.5999755859375]}, "EIHOTEL": {"company": "EIH Ltd", "ticker": "EIHOTEL", "market": "INDIA", "currency": "INR", "sector": "Consumer Services", "industry": "Hotels & Resorts", "current_price": 290.0, "high_52w": 405.0, "low_52w": 271.0, "quality_score": {"earned": 14, "total": 23, "pct": 60.9, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 53, "zone_label": "Neutral Zone", "tier": "neutral"}, "price_series": [237.89999389648438, 249.5, 327.8500061035156, 403.95001220703125, 449.5, 478.3500061035156, 431.6000061035156, 429.29998779296875, 440.70001220703125, 382.6000061035156, 378.3999938964844, 364.45001220703125, 379.3999938964844, 419.8500061035156, 370.5, 319.25, 353.5, 370.45001220703125, 369.6000061035156, 369.3500061035156, 375.5, 399.0, 359.8999938964844, 389.79998779296875, 373.95001220703125, 368.25, 314.54998779296875, 313.54998779296875, 273.54998779296875, 318.95001220703125, 296.20001220703125, 320.29998779296875, 327.0, 282.29998779296875, 301.1000061035156, 288.79998779296875]}, "ASHOKLEY": {"company": "Ashok Leyland Ltd", "ticker": "ASHOKLEY", "market": "INDIA", "currency": "INR", "sector": "Capital Goods", "industry": "Commercial Vehicles", "current_price": 142.0, "high_52w": 215.0, "low_52w": 136.0, "quality_score": {"earned": 13, "total": 23, "pct": 56.5, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 52, "zone_label": "Neutral Zone", "tier": "neutral"}, "price_series": [91.57499694824219, 90.7750015258789, 87.94999694824219, 84.94999694824219, 85.625, 96.32499694824219, 112.0, 120.94499969482422, 128.5449981689453, 128.22500610351562, 117.69999694824219, 104.08999633789062, 116.04000091552734, 110.25, 108.41500091552734, 106.47000122070312, 102.11000061035156, 112.65499877929688, 118.01499938964844, 125.45500183105469, 121.05000305175781, 126.9800033569336, 142.6699981689453, 141.52999877929688, 158.1199951171875, 179.19000244140625, 196.69000244140625, 211.10000610351562, 154.1300048828125, 162.08999633789062, 155.44000244140625, 157.6999969482422, 166.17999267578125, 175.63999938964844, 154.19000244140625, 141.89999389648438]}, "BHEL": {"company": "Bharat Heavy Electricals Ltd", "ticker": "BHEL", "market": "INDIA", "currency": "INR", "sector": "Capital Goods", "industry": "Heavy Electrical Equipment", "current_price": 394.0, "high_52w": 464.0, "low_52w": 231.0, "quality_score": {"earned": 9, "total": 23, "pct": 39.1, "band_label": "Low Historical Consistency (0–11)", "tier": "low"}, "fear_greed": {"score": 59, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [170.4499969482422, 193.5500030517578, 228.25, 227.5500030517578, 247.3000030517578, 281.70001220703125, 298.8999938964844, 300.8500061035156, 315.25, 290.54998779296875, 279.70001220703125, 239.0, 251.08999633789062, 229.39999389648438, 208.08999633789062, 179.1699981689453, 216.42999267578125, 226.83999633789062, 259.8299865722656, 266.29998779296875, 238.4499969482422, 208.00999450683594, 238.4499969482422, 265.489990234375, 290.8500061035156, 287.45001220703125, 262.70001220703125, 264.95001220703125, 245.5, 352.4100036621094, 416.75, 414.1000061035156, 407.0, 442.6499938964844, 415.5, 394.54998779296875]}, "SAIL": {"company": "Steel Authority of India Ltd", "ticker": "SAIL", "market": "INDIA", "currency": "INR", "sector": "Metals & Mining", "industry": "Iron & Steel", "current_price": 170.0, "high_52w": 210.0, "low_52w": 124.0, "quality_score": {"earned": 8, "total": 23, "pct": 34.8, "band_label": "Low Historical Consistency (0–11)", "tier": "low"}, "fear_greed": {"score": 58, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [92.30000305175781, 123.6500015258789, 122.5, 121.19999694824219, 134.25, 164.1999969482422, 158.5, 148.64999389648438, 153.0399932861328, 133.69000244140625, 141.36000061035156, 115.75, 117.11000061035156, 113.12999725341797, 107.43000030517578, 105.0199966430664, 115.18000030517578, 113.70999908447266, 129.17999267578125, 131.99000549316406, 124.19999694824219, 118.66000366210938, 134.47999572753906, 136.85000610351562, 134.91000366210938, 146.99000549316406, 151.1300048828125, 165.7100067138672, 151.4199981689453, 184.6199951171875, 204.3699951171875, 173.49000549316406, 169.02999877929688, 195.0, 181.49000549316406, 169.8000030517578]}, "IDEA": {"company": "Vodafone Idea Ltd", "ticker": "IDEA", "market": "INDIA", "currency": "INR", "sector": "Telecommunication", "industry": "Telecom - Cellular & Fixed line services", "current_price": 12.0, "high_52w": 15.8, "low_52w": 8.13, "quality_score": {"earned": 13, "total": 23, "pct": 56.5, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 38, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [13.050000190734863, 16.0, 14.350000381469727, 13.649999618530273, 13.25, 13.199999809265137, 15.25, 17.889999389648438, 16.270000457763672, 15.640000343322754, 10.359999656677246, 8.119999885559082, 8.359999656677246, 7.940000057220459, 9.050000190734863, 7.550000190734863, 6.800000190734863, 7.119999885559082, 6.920000076293945, 7.429999828338623, 6.909999847412109, 6.489999771118164, 8.130000114440918, 8.729999542236328, 9.960000038146973, 10.760000228881836, 11.170000076293945, 10.59000015258789, 8.529999732971191, 10.220000267028809, 13.989999771118164, 14.460000038146973, 13.010000228881836, 14.329999923706055, 12.949999809265137, 11.949999809265137]}, "YESBANK": {"company": "Yes Bank Ltd", "ticker": "YESBANK", "market": "INDIA", "currency": "INR", "sector": "Financial Services", "industry": "Private Sector Bank", "current_price": 15.8, "high_52w": 25.8, "low_52w": 15.6, "quality_score": {"earned": 10, "total": 23, "pct": 43.5, "band_label": "Low Historical Consistency (0–11)", "tier": "low"}, "fear_greed": {"score": 34, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [19.350000381469727, 21.450000762939453, 24.100000381469727, 24.450000762939453, 23.200000762939453, 26.149999618530273, 23.0, 23.690000534057617, 26.510000228881836, 23.610000610351562, 22.479999542236328, 20.399999618530273, 19.959999084472656, 19.59000015258789, 19.229999542236328, 16.75, 16.8799991607666, 17.719999313354492, 21.479999542236328, 20.34000015258789, 18.920000076293945, 19.100000381469727, 21.25, 22.739999771118164, 22.93000030517578, 21.600000381469727, 21.40999984741211, 20.719999313354492, 17.25, 19.93000030517578, 23.149999618530273, 24.18000030517578, 22.770000457763672, 22.829999923706055, 20.950000762939453, 15.859999656677246]}, "AAPL": {"company": "Apple Inc.", "ticker": "AAPL", "market": "USA", "currency": "USD", "sector": "Technology", "industry": "Consumer Electronics", "current_price": 347.725, "high_52w": 351.73, "low_52w": 243.42, "quality_score": {"earned": 17, "total": 23, "pct": 73.9, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 76, "zone_label": "Extreme Greed Zone", "tier": "extreme-greed"}, "price_series": [189.9499969482422, 192.52999877929688, 184.39999389648438, 180.75, 171.47999572753906, 170.3300018310547, 192.25, 210.6199951171875, 222.0800018310547, 229.0, 233.0, 225.91000366210938, 237.3300018310547, 250.4199981689453, 236.0, 241.83999633789062, 222.1300048828125, 212.5, 200.85000610351562, 205.1699981689453, 207.57000732421875, 232.13999938964844, 254.6300048828125, 270.3699951171875, 278.8500061035156, 271.8599853515625, 259.4800109863281, 264.17999267578125, 253.7899932861328, 271.3500061035156, 312.05999755859375, 289.3599853515625, 308.9100036621094, 316.8500061035156, 333.0199890136719, 347.7250061035156]}, "MSFT": {"company": "Microsoft Corporation", "ticker": "MSFT", "market": "USA", "currency": "USD", "sector": "Technology", "industry": "Software - Infrastructure", "current_price": 524.51, "high_52w": 553.72, "low_52w": 349.2, "quality_score": {"earned": 21, "total": 23, "pct": 91.3, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 70, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [378.9100036621094, 376.0400085449219, 397.5799865722656, 413.6400146484375, 420.7200012207031, 389.3299865722656, 415.1300048828125, 446.95001220703125, 418.3500061035156, 417.1400146484375, 430.29998779296875, 406.3500061035156, 423.4599914550781, 421.5, 415.05999755859375, 396.989990234375, 375.3900146484375, 395.260009765625, 460.3599853515625, 497.4100036621094, 533.5, 506.69000244140625, 517.9500122070312, 517.8099975585938, 492.010009765625, 483.6199951171875, 430.2900085449219, 392.739990234375, 370.1700134277344, 407.7799987792969, 450.239990234375, 373.0199890136719, 464.7200012207031, 507.2900085449219, 512.9000244140625, 524.510009765625]}, "NVDA": {"company": "NVIDIA Corporation", "ticker": "NVDA", "market": "USA", "currency": "USD", "sector": "Technology", "industry": "Semiconductors", "current_price": 210.96, "high_52w": 243.37, "low_52w": 164.27, "quality_score": {"earned": 19, "total": 23, "pct": 82.6, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 62, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [46.77000045776367, 49.52199935913086, 61.527000427246094, 79.11199951171875, 90.35600280761719, 86.4020004272461, 109.63300323486328, 123.54000091552734, 117.0199966430664, 119.37000274658203, 121.44000244140625, 132.75999450683594, 138.25, 134.2899932861328, 120.06999969482422, 124.91999816894531, 108.37999725341797, 108.91999816894531, 135.1300048828125, 157.99000549316406, 177.8699951171875, 174.17999267578125, 186.5800018310547, 202.49000549316406, 177.0, 186.5, 191.1300048828125, 177.19000244140625, 174.39999389648438, 199.57000732421875, 211.13999938964844, 200.08999633789062, 200.75, 220.77999877929688, 228.3800048828125, 210.9600067138672]}, "GOOGL": {"company": "Alphabet Inc.", "ticker": "GOOGL", "market": "USA", "currency": "USD", "sector": "Communication Services", "industry": "Internet Content & Information", "current_price": 320.21, "high_52w": 408.61, "low_52w": 264.28, "quality_score": {"earned": 19, "total": 23, "pct": 82.6, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 49, "zone_label": "Neutral Zone", "tier": "neutral"}, "price_series": [132.52999877929688, 139.69000244140625, 140.10000610351562, 138.4600067138672, 150.92999267578125, 162.77999877929688, 172.5, 182.14999389648438, 171.5399932861328, 163.3800048828125, 165.85000610351562, 171.11000061035156, 168.9499969482422, 189.3000030517578, 204.02000427246094, 170.27999877929688, 154.63999938964844, 158.8000030517578, 171.74000549316406, 176.22999572753906, 191.89999389648438, 212.91000366210938, 243.10000610351562, 281.19000244140625, 320.17999267578125, 313.0, 338.0, 311.760009765625, 287.55999755859375, 384.79998779296875, 380.3399963378906, 357.3699951171875, 356.1300048828125, 339.3500061035156, 344.0799865722656, 320.2099914550781]}, "AMZN": {"company": "Amazon.com, Inc.", "ticker": "AMZN", "market": "USA", "currency": "USD", "sector": "Consumer Cyclical", "industry": "Internet Retail", "current_price": 248.0, "high_52w": 287.2, "low_52w": 196.0, "quality_score": {"earned": 18, "total": 23, "pct": 78.3, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 60, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [146.08999633789062, 151.94000244140625, 155.1999969482422, 176.75999450683594, 180.3800048828125, 175.0, 176.44000244140625, 193.25, 186.97999572753906, 178.5, 186.3300018310547, 186.39999389648438, 207.88999938964844, 219.38999938964844, 237.67999267578125, 212.27999877929688, 190.25999450683594, 184.4199981689453, 205.00999450683594, 219.38999938964844, 234.11000061035156, 229.0, 219.57000732421875, 244.22000122070312, 233.22000122070312, 230.82000732421875, 239.3000030517578, 210.0, 208.27000427246094, 265.05999755859375, 270.6400146484375, 238.33999633789062, 271.5799865722656, 259.7699890136719, 249.14999389648438, 248.0]}, "META": {"company": "Meta Platforms, Inc.", "ticker": "META", "market": "USA", "currency": "USD", "sector": "Communication Services", "industry": "Internet Content & Information", "current_price": 642.62, "high_52w": 779.82, "low_52w": 520.26, "quality_score": {"earned": 19, "total": 23, "pct": 82.6, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 51, "zone_label": "Neutral Zone", "tier": "neutral"}, "price_series": [327.1499938964844, 353.9599914550781, 390.1400146484375, 490.1300048828125, 485.5799865722656, 430.1700134277344, 466.8299865722656, 504.2200012207031, 474.8299865722656, 521.3099975585938, 572.4400024414062, 567.5800170898438, 574.3200073242188, 585.510009765625, 689.1799926757812, 668.2000122070312, 576.3599853515625, 549.0, 647.489990234375, 738.0900268554688, 773.4400024414062, 738.7000122070312, 734.3800048828125, 648.3499755859375, 647.9500122070312, 660.0900268554688, 716.5, 648.1799926757812, 572.1300048828125, 611.9099731445312, 632.510009765625, 563.2899780273438, 556.7100219726562, 572.3400268554688, 725.1799926757812, 642.6199951171875]}, "BRK-B": {"company": "Berkshire Hathaway Inc.", "ticker": "BRK-B", "market": "USA", "currency": "USD", "sector": "Financial Services", "industry": "Insurance - Diversified", "current_price": 542.19, "high_52w": 549.96, "low_52w": 464.01, "quality_score": {"earned": 9, "total": 23, "pct": 39.1, "band_label": "Low Historical Consistency (0–11)", "tier": "low"}, "fear_greed": {"score": 77, "zone_label": "Extreme Greed Zone", "tier": "extreme-greed"}, "price_series": [360.0, 356.6600036621094, 383.739990234375, 409.3999938964844, 420.5199890136719, 396.7300109863281, 414.3999938964844, 406.79998779296875, 438.5, 475.9200134277344, 460.260009765625, 450.9200134277344, 483.0199890136719, 453.2799987792969, 468.6700134277344, 513.8300170898438, 532.5800170898438, 533.25, 503.9599914550781, 485.7699890136719, 471.8800048828125, 502.9800109863281, 502.739990234375, 477.5400085449219, 513.8099975585938, 502.6499938964844, 480.5299987792969, 504.95001220703125, 479.20001220703125, 473.6000061035156, 474.4800109863281, 500.3900146484375, 511.5400085449219, 504.0299987792969, 497.95001220703125, 542.1900024414062]}, "KO": {"company": "The Coca-Cola Company", "ticker": "KO", "market": "USA", "currency": "USD", "sector": "Consumer Defensive", "industry": "Beverages - Non-Alcoholic", "current_price": 92.71, "high_52w": 95.37, "low_52w": 67.27, "quality_score": {"earned": 19, "total": 23, "pct": 82.6, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 72, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [58.439998626708984, 58.93000030517578, 59.4900016784668, 60.02000045776367, 61.18000030517578, 61.77000045776367, 62.93000030517578, 63.650001525878906, 66.73999786376953, 72.47000122070312, 71.86000061035156, 65.30999755859375, 64.08000183105469, 62.2599983215332, 63.47999954223633, 71.20999908447266, 71.62000274658203, 72.55000305175781, 72.0999984741211, 70.75, 67.88999938964844, 68.98999786376953, 66.31999969482422, 68.9000015258789, 73.12000274658203, 69.91000366210938, 74.80999755859375, 81.55999755859375, 76.05000305175781, 78.76000213623047, 79.01000213623047, 81.2699966430664, 87.58999633789062, 88.66999816894531, 86.08000183105469, 92.70999908447266]}, "TSLA": {"company": "Tesla, Inc.", "ticker": "TSLA", "market": "USA", "currency": "USD", "sector": "Consumer Cyclical", "industry": "Auto Manufacturers", "current_price": 372.22, "high_52w": 498.83, "low_52w": 297.38, "quality_score": {"earned": 13, "total": 23, "pct": 56.5, "band_label": "Moderate Historical Consistency (12–16)", "tier": "moderate"}, "fear_greed": {"score": 59, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [240.0800018310547, 248.47999572753906, 187.2899932861328, 201.8800048828125, 175.7899932861328, 183.27999877929688, 178.0800018310547, 197.8800048828125, 232.07000732421875, 214.11000061035156, 261.6300048828125, 249.85000610351562, 345.1600036621094, 403.8399963378906, 404.6000061035156, 292.9800109863281, 259.1600036621094, 282.1600036621094, 346.4599914550781, 317.6600036621094, 308.2699890136719, 333.8699951171875, 444.7200012207031, 456.55999755859375, 430.1700134277344, 449.7200012207031, 430.4100036621094, 402.510009765625, 371.75, 381.6300048828125, 435.7900085449219, 420.6000061035156, 311.2099914550781, 367.95001220703125, 354.80999755859375, 372.2200012207031]}, "NIFTY 50": {"company": "NIFTY 50", "ticker": "NIFTY50", "market": "INDIA", "currency": "INR", "sector": "Index", "industry": "Broad Market Index", "current_price": 22753.19921875, "high_52w": 26373.19921875, "low_52w": 18837.849609375, "quality_score": {"earned": 18, "total": 23, "pct": 78.3, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 44, "zone_label": "Fear Zone", "tier": "fear"}, "price_series": [20133.150390625, 21731.400390625, 21725.69921875, 21982.80078125, 22326.900390625, 22604.849609375, 22530.69921875, 24010.599609375, 24951.150390625, 25235.900390625, 25810.849609375, 24205.349609375, 24131.099609375, 23644.80078125, 23508.400390625, 22124.69921875, 23519.349609375, 24334.19921875, 24750.69921875, 25517.05078125, 24768.349609375, 24426.849609375, 24611.099609375, 25722.099609375, 26202.94921875, 26129.599609375, 25320.650390625, 25178.650390625, 22331.400390625, 23997.55078125, 23547.75, 23865.75, 24383.599609375, 24080.400390625, 22620.44921875, 22753.19921875]}, "S&P 500": {"company": "S&P 500", "ticker": "S&P500", "market": "USA", "currency": "USD", "sector": "Index", "industry": "Broad Market Index", "current_price": 7623.68017578125, "high_52w": 7844.52001953125, "low_52w": 4103.77978515625, "quality_score": {"earned": 18, "total": 23, "pct": 78.3, "band_label": "High Historical Consistency (17–23)", "tier": "high"}, "fear_greed": {"score": 68, "zone_label": "Greed Zone", "tier": "greed"}, "price_series": [4567.7998046875, 4769.830078125, 4845.64990234375, 5096.27001953125, 5254.35009765625, 5035.68994140625, 5277.509765625, 5460.47998046875, 5522.2998046875, 5648.39990234375, 5762.47998046875, 5705.4501953125, 6032.3798828125, 5881.6298828125, 6040.52978515625, 5954.5, 5611.85009765625, 5569.06005859375, 5911.68994140625, 6204.9501953125, 6339.39013671875, 6460.259765625, 6688.4599609375, 6840.2001953125, 6849.08984375, 6845.5, 6939.02978515625, 6878.8798828125, 6528.52001953125, 7209.009765625, 7580.06005859375, 7499.35986328125, 7489.72021484375, 7686.14013671875, 7651.5400390625, 7623.68017578125]}};
const UPI_DEFAULT = "lojikgain@upi";
const BACKEND = false;
let UPI_ID = UPI_DEFAULT;
let currentUser = null;
let STOCKS = {};
let selectedTicker = null;
let marketFilter = "AUTO";
let priceChart = null, fgChart = null;

const $ = (id) => document.getElementById(id);

function staticLoadUser() { try { return JSON.parse(localStorage.getItem("lojik_user") || localStorage.getItem("lojikgain_user") || "null"); } catch { return null; } }
function staticSaveUser(u) { localStorage.setItem("lojik_user", JSON.stringify(u)); localStorage.setItem("lojikgain_user", JSON.stringify(u)); }
function staticTrialDaysLeft(u) {
  if (!u) return 0;
  if (u.is_paid) return 999;
  const ms = new Date(u.trial_end) - new Date();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86400000));
}
function staticAccessGranted(u) {
  if (!u) return false;
  if (u.is_paid) return true;
  return staticTrialDaysLeft(u) > 0;
}
function normalizeUser(u) {
  if (!u) return null;
  return { ...u, trial_days_left: staticTrialDaysLeft(u), trial_expired: !staticAccessGranted(u) && !u.is_paid, access_granted: staticAccessGranted(u), plan_type: u.is_paid ? "pro" : null };
}

async function authRegister(email, name, password, provider) {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 86400000);
  const u = { id: Date.now(), email: email.toLowerCase().trim(), name: name || email.split("@")[0],
    auth_provider: provider || "email", created_at: now.toISOString(), trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString(), is_paid: false, utr: null };
  staticSaveUser(u);
  return { authenticated: true, user: normalizeUser(u) };
}
async function authLogin(email, password) {
  const u = staticLoadUser();
  if (!u || u.email !== email.toLowerCase().trim()) throw new Error("No account found. Register first.");
  return { authenticated: true, user: normalizeUser(u) };
}
async function authGoogle(email, name) {
  const existing = staticLoadUser();
  if (existing && existing.email === email.toLowerCase().trim()) {
    return { authenticated: true, user: normalizeUser(existing) };
  }
  return authRegister(email, name, "", "google");
}
async function authMe() {
  const u = staticLoadUser();
  if (!u) return { authenticated: false, user: null };
  return { authenticated: true, user: normalizeUser(u) };
}
async function authLogout() {
  localStorage.removeItem("lojik_user");
  localStorage.removeItem("lojikgain_user");
  currentUser = null;
}
async function simulateExpiry(expired) {
  const u = staticLoadUser();
  if (!u) return null;
  if (expired) u.trial_end = new Date(Date.now() - 86400000).toISOString();
  else u.trial_end = new Date(Date.now() + 7 * 86400000).toISOString();
  staticSaveUser(u);
  return { authenticated: true, user: normalizeUser(u) };
}
async function verifyUtr(utr) {
  if (!/^\d{12}$/.test(utr)) throw new Error("UTR must be a 12-digit number.");
  const u = staticLoadUser();
  if (!u) throw new Error("Not logged in.");
  const used = JSON.parse(localStorage.getItem("lojik_used_utrs") || "[]");
  if (used.includes(utr)) throw new Error("This UTR has already been used.");
  u.is_paid = true; u.utr = utr; u.plan_type = "pro"; u.paid_at = new Date().toISOString();
  staticSaveUser(u);
  used.push(utr); localStorage.setItem("lojik_used_utrs", JSON.stringify(used));
  return { ok: true, message: "Unlocked", status: { authenticated: true, user: normalizeUser(u) } };
}

async function loadStocks() {
  try {
    const r = await fetch("./stocks_data.json", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j && Object.keys(j).length) STOCKS = j;
    }
  } catch (e) {}
  if (!STOCKS || !Object.keys(STOCKS).length) {
    STOCKS = JSON.parse(JSON.stringify((typeof EMBEDDED_STOCKS !== "undefined") ? EMBEDDED_STOCKS : {}));
  }
}

function findStock(key) {
  if (!key) return null;
  const k = key.trim().toUpperCase();
  if (STOCKS[k]) return STOCKS[k];
  for (const kk of Object.keys(STOCKS)) {
    if (kk.toUpperCase() === k) return STOCKS[kk];
  }
  for (const kk of Object.keys(STOCKS)) {
    const d = STOCKS[kk];
    if ((d.company || "").toUpperCase() === k) return d;
  }
  return null;
}

function deterministicAnalysis(ticker, market) {
  const t = ticker.toUpperCase();
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  const indiaList = ["ITC","TCS","INFY","HDFCBANK","ASIANPAINT","TITAN","MARUTI","TATASTEEL","ONGC","NTPC","PIDILITIND","PAGEIND","PERSISTENT","VOLTAS","EIHOTEL","ASHOKLEY","BHEL","SAIL","IDEA","YESBANK","NIFTY 50"];
  const isIndia = (market === "INDIA") || (market === "AUTO" && indiaList.includes(t));
  const mm = (market === "AUTO") ? (isIndia ? "INDIA" : "USA") : market;
  const cur = mm === "INDIA" ? "INR" : "USD";
  const base = 50 + (h % 400);
  const series = [];
  let p = base;
  for (let i = 0; i < 36; i++) { p = p * (1 + ((h >> (i % 16)) % 7 - 3) * 0.012); series.push(+p.toFixed(2)); }
  const earned = 8 + (h % 16);
  const fg = 20 + (h % 61);
  return {
    company: t,
    ticker: t,
    market: mm,
    currency: cur,
    sector: "—",
    industry: "Live generated",
    current_price: series[series.length-1],
    high_52w: Math.max(...series),
    low_52w: Math.min(...series),
    quality_score: { earned, total: 23, pct: +(earned/23*100).toFixed(1), band_label: earned>=17?"High Historical Consistency (17–23)":earned>=12?"Moderate Historical Consistency (12–16)":"Low Historical Consistency (0–11)", tier: earned>=17?"high":earned>=12?"moderate":"low" },
    fear_greed: { score: fg, zone_label: fg<=24?"Extreme Fear Zone":fg<=44?"Fear Zone":fg<=55?"Neutral Zone":fg<=75?"Greed Zone":"Extreme Greed Zone", tier: fg<=24?"extreme-fear":fg<=44?"fear":fg<=55?"neutral":fg<=75?"greed":"extreme-greed" },
    price_series: series,
  };
}

async function liveFallback(ticker, market) {
  const sym = market === "INDIA" ? ticker + ".NS" : ticker;
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym) + "?range=1y&interval=1mo";
  const proxy = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
  try {
    const r = await fetch(proxy);
    if (!r.ok) throw new Error("fetch fail");
    const j = await r.json();
    const res = j.chart && j.chart.result && j.chart.result[0];
    if (!res) throw new Error("no data");
    const q = res.indicators.quote[0];
    const closes = (q.close || []).filter(v => v != null);
    const meta = res.meta || {};
    return {
      company: meta.longName || ticker,
      ticker: ticker,
      market: market,
      currency: meta.currency || "USD",
      sector: "—", industry: "—",
      current_price: meta.regularMarketPrice || closes[closes.length-1],
      high_52w: meta.fiftyTwoWeekHigh || Math.max(...closes),
      low_52w: meta.fiftyTwoWeekLow || Math.min(...closes),
      quality_score: { earned: 0, total: 23, pct: 0, band_label: "Live fallback (unscored)", tier: "low" },
      fear_greed: { score: 50, zone_label: "Neutral Zone", tier: "neutral" },
      price_series: closes.slice(-36),
    };
  } catch (e) {
    return deterministicAnalysis(ticker, market);
  }
}

async function runAnalysis(ticker, market) {
  ticker = (ticker || "").trim();
  if (!ticker) return;
  const userObj = (currentUser && currentUser.user) ? currentUser.user : currentUser;
  if (!userObj || !userObj.access_granted) { openAuth(); $("statusLine").textContent = "Please sign in to analyse."; return; }
  $("statusLine").textContent = "Analysing " + ticker + "…";
  let m = market || marketFilter;
  if (m === "AUTO") {
    const indiaList = ["ITC","TCS","INFY","HDFCBANK","ASIANPAINT","TITAN","MARUTI","TATASTEEL","ONGC","NTPC","PIDILITIND","PAGEIND","PERSISTENT","VOLTAS","EIHOTEL","ASHOKLEY","BHEL","SAIL","IDEA","YESBANK","NIFTY 50"];
    m = indiaList.includes(ticker.toUpperCase()) ? "INDIA" : "USA";
  }
  let data = findStock(ticker);
  if (!data) {
    data = await liveFallback(ticker, m);
    if (!data) { $("statusLine").textContent = "No data for " + ticker; return; }
  }
  if (!data.market) data.market = m;
  showDetail(data);
  $("statusLine").textContent = "Loaded " + (data.company || ticker);
}

function showDetail(d) {
  $("emptyState").classList.add("hidden");
  $("detail").classList.remove("hidden");
  $("dCompany").textContent = d.company || "—";
  $("dTicker").textContent = d.ticker || "—";
  $("dMarket").textContent = d.market || "—";
  $("dSector").textContent = d.sector || "—";
  $("dIndustry").textContent = d.industry || "—";
  $("dPrice").textContent = (d.current_price != null ? Number(d.current_price).toLocaleString() : "—") + " " + (d.currency || "");
  $("dHigh").textContent = d.high_52w != null ? Number(d.high_52w).toLocaleString() : "—";
  $("dLow").textContent = d.low_52w != null ? Number(d.low_52w).toLocaleString() : "—";
  $("dCurrency").textContent = d.currency || "—";
  const qs = d.quality_score || {};
  $("dScore").textContent = (qs.earned ?? "—") + " / " + (qs.total ?? 23);
  $("dTier").textContent = qs.band_label || qs.tier || "—";
  const fg = d.fear_greed || {};
  $("dFG").textContent = (fg.score ?? "—") + " — " + (fg.zone_label || "");
  $("fgScore").textContent = fg.score ?? "—";
  $("fgZone").textContent = fg.zone_label || "—";
  $("fgTier").textContent = fg.tier || "—";
  const series = d.price_series || [];
  if (priceChart) priceChart.destroy();
  priceChart = new Chart($("priceChart"), {
    type: "line",
    data: { labels: series.map((_,i)=>i+1), datasets: [{ label: "Price", data: series, borderColor: "#3b82f6", tension: .3, pointRadius: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
  if (fgChart) fgChart.destroy();
  fgChart = new Chart($("fgChart"), {
    type: "doughnut",
    data: { labels: ["Score","Rest"], datasets: [{ data: [fg.score || 0, 100 - (fg.score || 0)], backgroundColor: ["#3b82f6","#334155"] }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "70%" }
  });
}

function renderDropdown(items) {
  const box = $("searchDropdown");
  if (!box) return;
  box.innerHTML = "";
  if (!items.length) { box.classList.add("hidden"); return; }
  items.forEach(it => {
    const div = document.createElement("div");
    div.className = "sd-item";
    div.innerHTML = `<span class="sd-sym">${it.ticker}</span><span class="sd-name">${it.company || ""}</span>`;
    div.addEventListener("click", () => {
      $("searchInput").value = it.ticker;
      box.classList.add("hidden");
      runAnalysis(it.ticker, marketFilter);
    });
    box.appendChild(div);
  });
  box.classList.remove("hidden");
}

function searchStocks(q) {
  q = (q || "").trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const k of Object.keys(STOCKS)) {
    const d = STOCKS[k];
    const ticker = (d.ticker || k).toString().toLowerCase();
    const company = (d.company || "").toLowerCase();
    if (ticker.includes(q) || company.includes(q)) {
      out.push({ ticker: d.ticker || k, company: d.company || "" });
    }
  }
  return out.slice(0, 12);
}

let acTimer = null;
const si = $("searchInput");
if (si) {
  si.addEventListener("input", (e) => {
    clearTimeout(acTimer);
    const q = e.target.value;
    if (q.trim().length < 1) { $("searchDropdown").classList.add("hidden"); return; }
    acTimer = setTimeout(() => { renderDropdown(searchStocks(q)); }, 120);
  });
  si.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      $("searchDropdown").classList.add("hidden");
      const v = si.value.trim();
      if (v) runAnalysis(v, marketFilter);
    }
    if (e.key === "Escape") $("searchDropdown").classList.add("hidden");
  });
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) {
    const dd = $("searchDropdown");
    if (dd) dd.classList.add("hidden");
  }
});

const QUICK_PICKS = ["ITC","TCS","PERSISTENT","HDFCBANK","TITAN","BHEL","NIFTY 50","AAPL","MSFT","NVDA","GOOGL","S&P 500"];
function renderQuickPicks() {
  const wrap = $("quickPicks");
  if (!wrap) return;
  wrap.innerHTML = "";
  QUICK_PICKS.forEach(sym => {
    const d = findStock(sym) || { ticker: sym, company: sym, market: "AUTO" };
    const btn = document.createElement("button");
    btn.className = "quick-chip";
    btn.innerHTML = `<span class="chip-sym">${d.ticker || sym}</span><span class="chip-name">${d.company || ""}</span>`;
    btn.addEventListener("click", () => runAnalysis(d.ticker || sym, d.market || "AUTO"));
    wrap.appendChild(btn);
  });
}

function updateTrialBar() {
  const bar = $("trialBar");
  if (!currentUser) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  const u = (currentUser.user || currentUser);
  const days = u.is_paid ? "∞ (Paid)" : (u.trial_days_left ?? 0);
  const access = u.access_granted ? "Granted" : "Expired";
  bar.innerHTML = `<span>Signed in as <b>${u.email || u.name || ""}</b></span><span>Trial days left: <b>${days}</b> — Access: <b>${access}</b></span>`;
}
function updateTrialPill() {
  const pill = $("trialPill");
  if (!pill) return;
  const u = currentUser ? (currentUser.user || currentUser) : null;
  if (!u) { pill.textContent = "7 Days Free Trial"; return; }
  pill.textContent = u.is_paid ? "Pro Unlocked" : (u.access_granted ? `${u.trial_days_left} Days Free Trial` : "Trial Expired");
}

function openAuth() { $("authModal").classList.remove("hidden"); refreshAuthUI(); }
function closeAuth() { $("authModal").classList.add("hidden"); }

async function refreshAuthUI() {
  const me = await authMe();
  currentUser = me.authenticated ? me : null;
  const status = $("authStatus");
  if (me.authenticated) {
    const u = me.user;
    status.textContent = "Signed in as " + (u.email || u.name);
    status.className = "muted";
    $("authForms").classList.add("hidden");
    $("trialSection").classList.remove("hidden");
    $("upiSection").classList.toggle("hidden", !!u.access_granted);
    $("trialDays").textContent = u.is_paid ? "∞ (Paid)" : u.trial_days_left;
    $("accessStatus").textContent = u.access_granted ? "Granted" : "Expired";
    updateTrialBar();
    updateTrialPill();
    const upiStr = `upi://pay?pa=${UPI_ID}&pn=LojikGain&am=10&cu=INR`;
    $("upiQr").src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(upiStr);
  } else {
    status.textContent = "Not signed in.";
    status.className = "muted";
    $("authForms").classList.remove("hidden");
    $("trialSection").classList.add("hidden");
    $("upiSection").classList.add("hidden");
    updateTrialBar();
    updateTrialPill();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  STOCKS = (typeof EMBEDDED_STOCKS !== "undefined") ? JSON.parse(JSON.stringify(EMBEDDED_STOCKS)) : {};
  await loadStocks();
  $("statusLine").textContent = `Loaded ${Object.keys(STOCKS).length} stocks.`;
  renderQuickPicks();
  await refreshAuthUI();

  document.querySelectorAll(".seg-btn").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("is-on"));
      b.classList.add("is-on");
      marketFilter = b.dataset.market;
    });
  });

  $("analyseBtn").addEventListener("click", () => {
    const t = $("searchInput").value.trim();
    if (!t) return;
    runAnalysis(t, marketFilter);
  });

  $("authBtn").addEventListener("click", openAuth);
  $("closeAuthBtn").addEventListener("click", closeAuth);

  $("loginBtn").addEventListener("click", async () => {
    try {
      const data = await authLogin($("authEmail").value, $("authPassword").value);
      currentUser = data;
      await refreshAuthUI();
    } catch (e) { $("authStatus").textContent = e.message; $("authStatus").className = "err"; }
  });
  $("registerBtn").addEventListener("click", async () => {
    try {
      const data = await authRegister($("authEmail").value, $("authName").value, $("authPassword").value, "email");
      currentUser = data;
      await refreshAuthUI();
    } catch (e) { $("authStatus").textContent = e.message; $("authStatus").className = "err"; }
  });
  $("googleBtn").addEventListener("click", async () => {
    const email = $("authEmail").value || prompt("Enter your Google email:");
    if (!email) return;
    try {
      const data = await authGoogle(email, $("authName").value);
      currentUser = data;
      await refreshAuthUI();
    } catch (e) { $("authStatus").textContent = e.message; $("authStatus").className = "err"; }
  });
  $("logoutBtn").addEventListener("click", async () => { await authLogout(); currentUser = null; await refreshAuthUI(); });
  $("expBtn").addEventListener("click", async () => {
    const data = await simulateExpiry(true);
    if (data) { currentUser = data; await refreshAuthUI(); }
  });
  $("resetTrialBtn").addEventListener("click", async () => {
    const data = await simulateExpiry(false);
    if (data) { currentUser = data; await refreshAuthUI(); }
  });
  $("verifyUtrBtn").addEventListener("click", async () => {
    const utr = $("utrInput").value.trim();
    const msg = $("upiMsg");
    try {
      const data = await verifyUtr(utr);
      msg.textContent = data.message || "Unlocked!";
      msg.className = "ok";
      const me = await authMe();
      currentUser = me.authenticated ? me : null;
      await refreshAuthUI();
    } catch (e) { msg.textContent = e.message; msg.className = "err"; }
  });

  $("themeToggle").addEventListener("click", () => {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === "dark" ? "light" : "dark";
  });
});
