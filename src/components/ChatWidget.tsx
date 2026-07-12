import { useState, useRef } from "react"

const knowledgeBase: { keywords: string[]; en: string; tl: string }[] = [
  {
    keywords: ["democracy", "demokrasya", "meaning of democracy", "ano ang demokrasya"],
    en: "Democracy is a system of government where the people hold the power to vote on laws and elect their leaders. Example: In the Philippines, citizens vote for their president and senators every election. Key features: free elections, human rights, rule of law, and majority rule with minority rights.",
    tl: "Ang demokrasya ay isang sistema ng pamahalaan kung saan ang kapangyarihan ay nasa kamay ng mga mamamayan na bumoto sa mga batas at pumili ng kanilang mga pinuno. Halimbawa: Sa Pilipinas, ang mga mamamayan ay bumoboto para sa kanilang pangulo at mga senador tuwing eleksyon. Mga pangunahing katangian: malayang eleksyon, karapatang pantao, panuntunan ng batas, at pamamahala ng nakararami na may paggalang sa karapatan ng minorya."
  },
  {
    keywords: ["photosynthesis", "photosynthesis meaning", "ano ang photosynthesis", "pagpapaganda ng halaman"],
    en: "Photosynthesis is the process by which green plants make their own food using sunlight, water, and carbon dioxide. They produce glucose (energy) and release oxygen. Formula: 6CO\u2082 + 6H\u2082O + sunlight \u2192 C\u2086H\u2081\u2082O\u2086 + 6O\u2082. Example: A leaf uses sunlight to turn water and CO\u2082 into food for the plant.",
    tl: "Ang photosynthesis ay ang proseso kung saan gumagawa ang mga halaman ng kanilang sariling pagkain gamit ang sikat ng araw, tubig, at carbon dioxide. Gumagawa sila ng glucose (enerhiya) at naglalabas ng oxygen. Halimbawa: Ang dahon ay gumagamit ng sikat ng araw upang gawing pagkain ang tubig at CO\u2082 para sa halaman."
  },
  {
    keywords: ["gravity", "ano ang gravity", "meaning of gravity", "grabiti"],
    en: "Gravity is a natural force that pulls objects toward each other. On Earth, it gives us weight and keeps us on the ground. Sir Isaac Newton discovered gravity when an apple fell from a tree. Example: When you jump, gravity pulls you back down. The formula is F = G \u00d7 (m\u2081 \u00d7 m\u2082) / r\u00b2.",
    tl: "Ang gravity ay isang natural na puwersa na humihila ng mga bagay patungo sa isa't isa. Sa Earth, ito ang nagbibigay sa atin ng timbang at nagpapanatili sa atin sa lupa. Natuklasan ni Sir Isaac Newton ang gravity nang mahulog ang isang mansanas mula sa puno. Halimbawa: Kapag tumalon ka, hinihila ka pabalik ng gravity."
  },
  {
    keywords: ["republic", "republic act", "republic of the philippines", "republika"],
    en: "A republic is a form of government where the country is led by elected representatives and an elected president, not a king or queen. The Philippines is a democratic republic. Example: The President of the Philippines is the head of state and is elected by the people.",
    tl: "Ang republika ay isang uri ng pamahalaan kung saan ang bansa ay pinamumunuan ng mga inihalal na kinatawan at isang inihalal na pangulo, hindi ng isang hari o reyna. Ang Pilipinas ay isang demokratikong republika. Halimbawa: Ang Pangulo ng Pilipinas ang pinuno ng estado at inihalal ng mga mamamayan."
  },
  {
    keywords: ["constitution", "saligang batas", "1987 constitution", "ano ang konstitusyon"],
    en: "A constitution is the supreme law of the land. It outlines the fundamental principles, rights, and structure of the government. The Philippines' current constitution is the 1987 Constitution. Example: Article III of the Constitution is the Bill of Rights, which protects the freedoms of every Filipino.",
    tl: "Ang konstitusyon ay ang pinakamataas na batas ng bansa. Binabalangkas nito ang mga pangunahing prinsipyo, karapatan, at istruktura ng pamahalaan. Ang kasalukuyang konstitusyon ng Pilipinas ay ang 1987 Konstitusyon. Halimbawa: Ang Artikulo III ng Konstitusyon ay ang Bill of Rights, na nagpoprotekta sa mga kalayaan ng bawat Pilipino."
  },
  {
    keywords: ["ecosystem", "ekosistema", "what is an ecosystem", "ano ang ecosystem"],
    en: "An ecosystem is a community where living things (plants, animals, microorganisms) interact with each other and their non-living environment (air, water, soil). Example: A pond ecosystem has fish, water plants, algae, insects, and microorganisms all living together and depending on each other.",
    tl: "Ang ekosistema ay isang komunidad kung saan ang mga bagay na may buhay (halaman, hayop, mikroorganismo) ay nakikipag-ugnayan sa isa't isa at sa kanilang kapaligirang walang buhay (hangin, tubig, lupa). Halimbawa: Ang ekosistema ng lawa ay may isda, halamang tubig, algae, insekto, at mikroorganismo na magkakasamang nabubuhay at umaasa sa isa't isa."
  },
  {
    keywords: ["global warming", "climate change", "global warming meaning", "climate change meaning", "pagbabago ng klima"],
    en: "Global warming is the long-term rise in Earth's average temperature due to increased greenhouse gases (like CO\u2082 and methane) from human activities like burning fossil fuels and deforestation. Effects include melting ice caps, rising sea levels, and extreme weather. Example: The burning of coal in power plants releases CO\u2082 that traps heat in the atmosphere.",
    tl: "Ang global warming ay ang pangmatagalang pagtaas ng average na temperatura ng Earth dahil sa pagdami ng greenhouse gases (tulad ng CO\u2082 at methane) mula sa mga gawain ng tao tulad ng pagsunog ng fossil fuels at pagputol ng mga puno. Kabilang sa mga epekto ay ang pagtunaw ng mga yelo, pagtaas ng antas ng dagat, at matinding panahon."
  },
  {
    keywords: ["computer", "computer parts", "what is computer", "ano ang computer", "kompyuter"],
    en: "A computer is an electronic device that processes data and performs tasks according to instructions (programs). It has hardware (physical parts like CPU, monitor, keyboard, mouse) and software (programs like Windows, web browsers, games). Example: When you type a document in Microsoft Word, the CPU processes your keystrokes and displays them on the monitor.",
    tl: "Ang computer ay isang elektronikong kagamitan na nagpoproseso ng datos at nagsasagawa ng mga gawain ayon sa mga tagubilin (programa). Ito ay may hardware (mga pisikal na bahagi tulad ng CPU, monitor, keyboard, mouse) at software (mga programa tulad ng Windows, web browser, laro)."
  },
  {
    keywords: ["algebra", "what is algebra", "ano ang algebra", "alhebra"],
    en: "Algebra is a branch of mathematics that uses variables (like x and y) to represent numbers and solve equations. It helps us find unknown values. Example: In the equation x + 5 = 12, we solve for x by subtracting 5 from both sides: x = 7. Algebra is used in budgeting, engineering, and everyday problem-solving.",
    tl: "Ang algebra ay isang sangay ng matematika na gumagamit ng mga variable (tulad ng x at y) upang kumatawan sa mga numero at malutas ang mga equation. Ito ay tumutulong sa atin na makahanap ng mga hindi kilalang halaga. Halimbawa: Sa equation na x + 5 = 12, solve natin ang x sa pamamagitan ng pagbawas ng 5 sa magkabilang panig: x = 7."
  },
  {
    keywords: ["geometry", "what is geometry", "ano ang geometry", "heometriya"],
    en: "Geometry is the branch of mathematics that deals with shapes, sizes, angles, and dimensions of objects. It studies points, lines, surfaces, and solids. Example: A triangle has 3 sides and 3 angles. The area of a rectangle is length \u00d7 width. Geometry is used in architecture, engineering, and design.",
    tl: "Ang geometry ay ang sangay ng matematika na tumatalakay sa mga hugis, sukat, anggulo, at dimensyon ng mga bagay. Pinag-aaralan nito ang mga punto, linya, ibabaw, at solid. Halimbawa: Ang tatsulok ay may 3 gilid at 3 anggulo. Ang area ng parihaba ay haba \u00d7 lapad."
  },
  {
    keywords: ["volcano", "ano ang bulkan", "what is volcano", "bulkan", "active volcano"],
    en: "A volcano is an opening in the Earth's crust where molten rock (magma), ash, and gases erupt. There are active volcanoes (erupt recently) and dormant volcanoes (haven't erupted for a long time but may again). Example: Mount Mayon in Albay is the most active volcano in the Philippines, known for its perfect cone shape.",
    tl: "Ang bulkan ay isang butas sa crust ng Earth kung saan lumalabas ang tunaw na bato (magma), abo, at mga gas. May mga aktibong bulkan (kamakailang pumutok) at mga dormant na bulkan (matagal nang hindi pumutok ngunit maaaring pumutok muli). Halimbawa: Ang Bulkang Mayon sa Albay ay ang pinakaaktibong bulkan sa Pilipinas."
  },
  {
    keywords: ["weather", "panahon", "weather and climate", "ano ang weather", "climate"],
    en: "Weather refers to the day-to-day condition of the atmosphere in a specific place (temperature, rain, wind, humidity). Climate is the average weather pattern over a long period. Example: Today's weather in Manila is 32\u00b0C with scattered thunderstorms. The climate of the Philippines is tropical, with wet and dry seasons.",
    tl: "Ang weather ay tumutukoy sa araw-araw na kondisyon ng atmospera sa isang partikular na lugar (temperatura, ulan, hangin, halumigmig). Ang klima ay ang average na pattern ng panahon sa mahabang panahon. Halimbawa: Ang weather ngayon sa Maynila ay 32\u00b0C na may mga pagkidlat-pagkulog. Ang klima ng Pilipinas ay tropikal."
  },
  {
    keywords: ["rights", "karapatan", "human rights", "bill of rights", "karapatang pantao"],
    en: "Rights are freedoms and protections that every person has under the law. The Philippine Constitution's Bill of Rights (Article III) protects rights such as: freedom of speech, right to life and liberty, right to due process, freedom of religion, and right to equal protection. Example: You have the right to express your opinion without fear of punishment.",
    tl: "Ang mga karapatan ay mga kalayaan at proteksyon na mayroon ang bawat tao sa ilalim ng batas. Ang Bill of Rights ng Konstitusyon ng Pilipinas (Artikulo III) ay nagpoprotekta sa mga karapatan tulad ng: kalayaan sa pananalita, karapatan sa buhay at kalayaan, karapatan sa due process, kalayaan sa relihiyon, at karapatan sa pantay na proteksyon."
  },
  {
    keywords: ["solar system", "sistema solar", "planets", "mga planeta", "ano ang solar system"],
    en: "The Solar System consists of the Sun and everything that orbits around it: 8 planets (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune), dwarf planets, moons, asteroids, and comets. The Sun is a star at the center. Example: Earth is the third planet from the Sun and the only known planet with life.",
    tl: "Ang Solar System ay binubuo ng Araw at lahat ng umiikot dito: 8 planeta (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune), dwarf planets, buwan, asteroids, at comets. Ang Araw ay isang bituin sa gitna. Halimbawa: Ang Earth ay ikatlong planeta mula sa Araw at ang tanging planetang may buhay."
  },
  {
    keywords: ["cell", "cells", "biology cell", "ano ang cell", "selula", "animal cell", "plant cell"],
    en: "Cells are the basic building blocks of all living things. The human body has trillions of cells. There are two main types: animal cells and plant cells. Plant cells have a cell wall and chloroplasts (for photosynthesis), while animal cells do not. Example: Red blood cells carry oxygen throughout your body.",
    tl: "Ang mga selula ay ang pangunahing bloke ng gusali ng lahat ng may buhay. Ang katawan ng tao ay may trilyong selula. May dalawang pangunahing uri: selula ng hayop at selula ng halaman. Ang selula ng halaman ay may cell wall at chloroplasts (para sa photosynthesis), habang ang selula ng hayop ay wala."
  },
  {
    keywords: ["fraction", "fractions", "what is fraction", "ano ang fraction", "praksyon"],
    en: "A fraction represents a part of a whole. It has a numerator (top number) and a denominator (bottom number). Example: The fraction 3/4 means 3 parts out of 4 equal parts. If you eat 3 slices of a pizza cut into 4 slices, you ate 3/4 of the pizza. Fractions can be added, subtracted, multiplied, and divided.",
    tl: "Ang fraction ay kumakatawan sa isang bahagi ng kabuuan. Ito ay may numerator (numero sa itaas) at denominator (numero sa ibaba). Halimbawa: Ang fraction na 3/4 ay nangangahulugang 3 bahagi mula sa 4 na magkakaparehong bahagi. Kung kumain ka ng 3 hiwa ng pizza na hinati sa 4 na hiwa, kumain ka ng 3/4 ng pizza."
  },
  {
    keywords: ["noun", "verb", "adjective", "adverb", "parts of speech", "what is noun", "pangngalan", "pandiwa", "pang-uri"],
    en: "Parts of speech are categories of words based on their function in a sentence. The main parts are: Noun (names a person, place, or thing - 'Maria', 'school'), Verb (action or state - 'run', 'is'), Adjective (describes a noun - 'beautiful'), and Adverb (describes a verb - 'quickly'). Example: 'The tall girl runs quickly.' - tall is adjective, girl is noun, runs is verb, quickly is adverb.",
    tl: "Ang mga bahagi ng pananalita ay mga kategorya ng mga salita batay sa kanilang gamit sa pangungusap. Ang pangunahing bahagi ay: Pangngalan (pangalan ng tao, lugar, o bagay - 'Maria', 'paaralan'), Pandiwa (kilos o estado - 'tumakbo', 'ay'), Pang-uri (naglalarawan ng pangngalan - 'maganda'), at Pang-abay (naglalarawan ng pandiwa - 'mabilis')."
  },
  {
    keywords: ["energy", "what is energy", "ano ang energy", "enerhiya", "forms of energy"],
    en: "Energy is the ability to do work or cause change. It comes in many forms: kinetic (motion), potential (stored), thermal (heat), electrical, chemical, nuclear, and light. The law of conservation of energy says energy cannot be created or destroyed, only transformed. Example: A light bulb transforms electrical energy into light and heat energy.",
    tl: "Ang enerhiya ay ang kakayahang gumawa ng trabaho o magdulot ng pagbabago. Ito ay may maraming anyo: kinetic (galaw), potential (nakaimbak), thermal (init), electrical, kemikal, nuclear, at liwanag. Ang batas ng konserbasyon ng enerhiya ay nagsasabing ang enerhiya ay hindi maaaring likhain o sirain, tanging maaaring baguhin ang anyo."
  },
  {
    keywords: ["matter", "states of matter", "ano ang matter", "matter meaning", "solid liquid gas"],
    en: "Matter is anything that has mass and takes up space. It exists in three main states: Solid (fixed shape and volume - ice, rock), Liquid (fixed volume but takes shape of container - water, oil), and Gas (no fixed shape or volume - air, steam). Example: Water can exist as solid ice, liquid water, or gaseous steam depending on temperature.",
    tl: "Ang matter ay anumang bagay na may masa at kumukuha ng espasyo. Ito ay may tatlong pangunahing estado: Solid (nakapirming hugis at volume - yelo, bato), Liquid (nakapirming volume ngunit sumusunod sa hugis ng lalagyan - tubig, langis), at Gas (walang nakapirming hugis o volume - hangin, singaw)."
  },
  {
    keywords: ["probability", "ano ang probability", "what is probability", "probabilidad"],
    en: "Probability is the measure of how likely an event is to happen. It ranges from 0 (impossible) to 1 (certain). Formula: Probability = Number of favorable outcomes / Total number of possible outcomes. Example: When flipping a coin, the probability of getting heads is 1/2 or 50% because there are 2 possible outcomes and 1 favorable outcome.",
    tl: "Ang probability ay ang sukat kung gaano kalamang mangyari ang isang kaganapan. Ito ay mula 0 (imposible) hanggang 1 (tiyak). Pormula: Probability = Bilang ng paborableng resulta / Kabuuang bilang ng posibleng resulta. Halimbawa: Sa paghagis ng barya, ang probability ng pagkuha ng ulo ay 1/2 o 50%."
  }
]

const dictionaryBase: { word: string; en: string; example_en: string; tl: string; example_tl: string }[] = [
  {
    word: "photosynthesis",
    en: "Photosynthesis is the process by which green plants make their own food using sunlight, water, and carbon dioxide.",
    example_en: "A leaf uses sunlight to turn water and CO₂ into food for the plant, releasing oxygen as a byproduct.",
    tl: "Ang photosynthesis ay ang proseso kung saan gumagawa ang mga halaman ng kanilang sariling pagkain gamit ang sikat ng araw, tubig, at carbon dioxide.",
    example_tl: "Ang dahon ay gumagamit ng sikat ng araw upang gawing pagkain ang tubig at CO₂ para sa halaman, at naglalabas ng oxygen."
  },
  {
    word: "gravity",
    en: "Gravity is a natural force that pulls objects with mass toward each other. On Earth, it gives us weight and keeps us grounded.",
    example_en: "When you jump, gravity pulls you back down to the ground instead of floating into space.",
    tl: "Ang gravity ay isang natural na puwersa na humihila ng mga bagay na may masa patungo sa isa't isa. Sa Earth, ito ang nagbibigay sa atin ng timbang.",
    example_tl: "Kapag tumalon ka, hinihila ka pabalik ng gravity sa lupa sa halip na lumutang sa kalawakan."
  },
  {
    word: "democracy",
    en: "Democracy is a system of government where citizens hold power to vote on laws and elect their leaders.",
    example_en: "In the Philippines, citizens vote for their president, senators, and local officials every election.",
    tl: "Ang demokrasya ay isang sistema ng pamahalaan kung saan ang mga mamamayan ang may kapangyarihang bumoto sa mga batas at pumili ng kanilang mga pinuno.",
    example_tl: "Sa Pilipinas, bumoboto ang mga mamamayan para sa kanilang pangulo, senador, at lokal na opisyal tuwing eleksyon."
  },
  {
    word: "ecosystem",
    en: "An ecosystem is a community where living things (plants, animals, microorganisms) interact with each other and their non-living environment (air, water, soil).",
    example_en: "A pond ecosystem has fish, water plants, algae, and insects all living together and depending on each other for survival.",
    tl: "Ang ekosistema ay isang komunidad kung saan ang mga bagay na may buhay ay nakikipag-ugnayan sa isa't isa at sa kanilang kapaligirang walang buhay.",
    example_tl: "Ang ekosistema ng lawa ay may isda, halamang tubig, algae, at insekto na magkakasamang nabubuhay at umaasa sa isa't isa."
  },
  {
    word: "constitution",
    en: "A constitution is the supreme law of the land that outlines the fundamental principles, rights, and structure of the government.",
    example_en: "Article III of the Philippine Constitution is the Bill of Rights, which protects the freedoms of every Filipino.",
    tl: "Ang konstitusyon ay ang pinakamataas na batas ng bansa na nagbabalangkas ng mga pangunahing prinsipyo, karapatan, at istruktura ng pamahalaan.",
    example_tl: "Ang Artikulo III ng Konstitusyon ng Pilipinas ay ang Bill of Rights, na nagpoprotekta sa mga kalayaan ng bawat Pilipino."
  },
  {
    word: "republic",
    en: "A republic is a form of government where the country is led by elected representatives and an elected president, not a monarch.",
    example_en: "The Philippines is a democratic republic where the President is elected by the people as head of state.",
    tl: "Ang republika ay isang uri ng pamahalaan kung saan ang bansa ay pinamumunuan ng mga inihalal na kinatawan at isang inihalal na pangulo.",
    example_tl: "Ang Pilipinas ay isang demokratikong republika kung saan ang Pangulo ay inihalal ng mga mamamayan bilang pinuno ng estado."
  },
  {
    word: "fraction",
    en: "A fraction represents a part of a whole. It has a numerator (top number) and a denominator (bottom number).",
    example_en: "The fraction 3/4 means 3 parts out of 4 equal parts — if you eat 3 slices of a pizza cut into 4 slices, you ate 3/4 of the pizza.",
    tl: "Ang fraction ay kumakatawan sa isang bahagi ng kabuuan. Ito ay may numerator (numero sa itaas) at denominator (numero sa ibaba).",
    example_tl: "Ang fraction na 3/4 ay nangangahulugang 3 bahagi mula sa 4 — kung kumain ka ng 3 hiwa ng pizza na hinati sa 4, kumain ka ng 3/4 ng pizza."
  },
  {
    word: "probability",
    en: "Probability is the measure of how likely an event is to happen, ranging from 0 (impossible) to 1 (certain).",
    example_en: "When flipping a coin, the probability of getting heads is 1/2 or 50% because there are 2 possible outcomes and 1 favorable outcome.",
    tl: "Ang probability ay ang sukat kung gaano kalamang mangyari ang isang kaganapan, mula 0 (imposible) hanggang 1 (tiyak).",
    example_tl: "Sa paghagis ng barya, ang probability ng pagkuha ng ulo ay 1/2 o 50% dahil may 2 posibleng resulta at 1 paborableng resulta."
  },
  {
    word: "energy",
    en: "Energy is the ability to do work or cause change. It comes in forms like kinetic, potential, thermal, electrical, and chemical.",
    example_en: "A light bulb transforms electrical energy into light and heat energy so you can see in a dark room.",
    tl: "Ang enerhiya ay ang kakayahang gumawa ng trabaho o magdulot ng pagbabago. Ito ay may mga anyo tulad ng kinetic, potential, thermal, electrical, at kemikal.",
    example_tl: "Ang bombilya ay nagpapalit ng electrical energy tungo sa liwanag at init upang makakita ka sa madilim na silid."
  },
  {
    word: "matter",
    en: "Matter is anything that has mass and takes up space. It exists in three main states: solid, liquid, and gas.",
    example_en: "Water can exist as solid ice, liquid water, or gaseous steam depending on the temperature.",
    tl: "Ang matter ay anumang bagay na may masa at kumukuha ng espasyo. Ito ay may tatlong pangunahing estado: solid, liquid, at gas.",
    example_tl: "Ang tubig ay maaaring maging solid na yelo, liquid na tubig, o gas na singaw depende sa temperatura."
  },
  {
    word: "cell",
    en: "A cell is the basic building block of all living things. The human body has trillions of cells.",
    example_en: "Red blood cells carry oxygen throughout your body, while white blood cells fight infections.",
    tl: "Ang selula ay ang pangunahing bloke ng gusali ng lahat ng may buhay. Ang katawan ng tao ay may trilyong selula.",
    example_tl: "Ang red blood cells ay nagdadala ng oxygen sa iyong katawan, habang ang white blood cells ay lumalaban sa mga impeksyon."
  },
  {
    word: "climate",
    en: "Climate is the average weather pattern of a place over a long period (usually 30 years or more).",
    example_en: "The Philippines has a tropical climate with wet and dry seasons, while Japan has four distinct seasons.",
    tl: "Ang klima ay ang average na pattern ng panahon ng isang lugar sa mahabang panahon (karaniwang 30 taon o higit pa).",
    example_tl: "Ang Pilipinas ay may tropikal na klima na may tag-ulan at tag-araw, habang ang Japan ay may apat na panahon."
  },
  {
    word: "erosion",
    en: "Erosion is the process where soil, rock, or sand is worn away and moved by natural forces like wind, water, or ice.",
    example_en: "Heavy rain can cause soil erosion on mountain slopes, making the land unstable and less fertile.",
    tl: "Ang erosion ay ang proseso kung saan ang lupa, bato, o buhangin ay nasisira at inililipat ng mga natural na puwersa tulad ng hangin, tubig, o yelo.",
    example_tl: "Ang malakas na ulan ay maaaring magdulot ng soil erosion sa mga dalisdis ng bundok, na nagpapahirap sa lupa."
  },
  {
    word: "habitat",
    en: "A habitat is the natural home or environment where an animal, plant, or organism lives and grows.",
    example_en: "The forest is the natural habitat of birds, deer, and many tree species.",
    tl: "Ang habitat ay ang natural na tahanan o kapaligiran kung saan nakatira at lumalaki ang isang hayop, halaman, o organismo.",
    example_tl: "Ang kagubatan ay natural na habitat ng mga ibon, usa, at maraming uri ng puno."
  },
  {
    word: "pollution",
    en: "Pollution is the introduction of harmful substances or contaminants into the environment, causing damage to living things.",
    example_en: "Factories releasing smoke into the air cause air pollution, which can lead to respiratory problems.",
    tl: "Ang pollution ay ang pagpasok ng mga nakakapinsalang sangkap sa kapaligiran, na nagdudulot ng pinsala sa mga may buhay.",
    example_tl: "Ang mga pabrika na naglalabas ng usok sa hangin ay nagdudulot ng air pollution, na maaaring magdulot ng mga problema sa paghinga."
  },
  {
    word: "noun",
    en: "A noun is a word that names a person, place, thing, or idea. It is one of the main parts of speech.",
    example_en: "In 'Maria went to school,' both 'Maria' (person) and 'school' (place) are nouns.",
    tl: "Ang pangngalan ay salitang nagpapangalan ng tao, lugar, bagay, o ideya. Ito ay isa sa mga pangunahing bahagi ng pananalita.",
    example_tl: "Sa 'Pumunta si Maria sa paaralan,' ang 'Maria' (tao) at 'paaralan' (lugar) ay mga pangngalan."
  },
  {
    word: "verb",
    en: "A verb is a word that describes an action, occurrence, or state of being. It tells what the subject does or is.",
    example_en: "In 'She runs every morning,' the word 'runs' is a verb because it describes the action.",
    tl: "Ang pandiwa ay salitang naglalarawan ng kilos, pangyayari, o estado ng pagiging. Ito ay nagsasabi kung ano ang ginagawa ng simuno.",
    example_tl: "Sa 'Siya ay tumatakbo tuwing umaga,' ang 'tumatakbo' ay pandiwa dahil ito ay naglalarawan ng kilos."
  },
  {
    word: "adjective",
    en: "An adjective is a word that describes or modifies a noun or pronoun, giving more information about it.",
    example_en: "In 'The tall girl,' the word 'tall' is an adjective describing the noun 'girl.'",
    tl: "Ang pang-uri ay salitang naglalarawan o nagbibigay ng karagdagang impormasyon tungkol sa pangngalan o panghalip.",
    example_tl: "Sa 'Ang matangkad na babae,' ang 'matangkad' ay pang-uri na naglalarawan sa pangngalang 'babae.'"
  },
  {
    word: "solar system",
    en: "The Solar System consists of the Sun and everything that orbits it, including 8 planets, moons, asteroids, and comets.",
    example_en: "Earth is the third planet from the Sun and the only known planet that supports life.",
    tl: "Ang Solar System ay binubuo ng Araw at lahat ng umiikot dito, kabilang ang 8 planeta, buwan, asteroid, at kometa.",
    example_tl: "Ang Earth ay ikatlong planeta mula sa Araw at ang tanging planetang alam natin na may buhay."
  },
  {
    word: "force",
    en: "Force is a push or pull on an object that can cause it to move, stop, or change direction. It is measured in Newtons.",
    example_en: "Pushing a shopping cart applies force that makes the cart move forward.",
    tl: "Ang force ay isang pagtulak o paghila sa isang bagay na maaaring magpaandar, magpahinto, o magpalit ng direksyon nito.",
    example_tl: "Ang pagtulak ng shopping cart ay naglalapat ng force na nagpapagalaw sa cart pasulong."
  }
]

const faqs = [
  { q: "How do I start a module?", a: "Go to My Modules, find an \"Ongoing\" or \"Not Started\" module, and click the Start button to begin.", tl: "Pumunta sa My Modules, hanapin ang modyul na \"Ongoing\" o \"Not Started\", at i-click ang Start button." },
  { q: "How are my grades computed?", a: "Grades are based on activities (30%), quizzes (30%), tasks (20%), and assignments (20%). Check the Progress page for details.", tl: "Ang mga grado ay batay sa activities (30%), quizzes (30%), tasks (20%), at assignments (20%). Tingnan ang Progress page para sa detalye." },
  { q: "How do I submit an assignment?", a: "Navigate to Assignments, select the assignment, upload your file, and click Submit.", tl: "Pumunta sa Assignments, piliin ang assignment, i-upload ang iyong file, at i-click ang Submit." },
  { q: "What is the passing grade?", a: "The minimum passing grade for each module is 60%. You need at least 60% to earn the module badge.", tl: "Ang minimum na passing grade para sa bawat modyul ay 60%. Kailangan mo ng hindi bababa sa 60% upang makuha ang module badge." },
  { q: "How do I reset my password?", a: "Go to Settings, click Change Password, enter your current password (password123) and your new password.", tl: "Pumunta sa Settings, i-click ang Change Password, ilagay ang iyong kasalukuyang password (password123) at ang iyong bagong password." },
  { q: "How do I switch between light and dark mode?", a: "In Settings, toggle the Dark Mode switch. Your preference will be saved automatically.", tl: "Sa Settings, i-toggle ang Dark Mode switch. Ang iyong preference ay awtomatikong mai-save." },
  { q: "What if I fail a module?", a: "You can retake any failed module. Go to My Modules, find the failed module, and click Start again to redo it.", tl: "Maaari mong ulitin ang anumang bagsak na modyul. Pumunta sa My Modules, hanapin ang bagsak na modyul, at i-click muli ang Start." },
  { q: "How do I contact my teacher?", a: "Your teacher's contact info is on the Profile page. You can also reach out through your section's class schedule.", tl: "Ang contact info ng iyong guro ay nasa Profile page. Maaari ka ring makipag-ugnayan sa pamamagitan ng class schedule ng iyong section." }
]

const tagalogWords = ["ano", "ang", "ay", "mga", "ng", "sa", "ko", "mo", "ka", "ako", "ikaw", "sila", "tayo", "kami", "kayo", "ito", "iyan", "doon", "dito", "bakit", "paano", "saan", "kailan", "sino", "magkano", "para", "may", "mayroon", "wala", "meron", "po", "opo", "oo", "hindi", "oo", "sige", "oo", "talaga"]

function detectLanguage(text: string): "tl" | "en" {
  const words = text.toLowerCase().split(/\s+/)
  const tagalogCount = words.filter(w => tagalogWords.includes(w)).length
  return tagalogCount >= 2 ? "tl" : "en"
}

function findKnowledgeAnswer(query: string, lang: "tl" | "en"): string | null {
  const lower = query.toLowerCase()
  for (const item of knowledgeBase) {
    if (item.keywords.some(kw => lower.includes(kw))) {
      return lang === "tl" ? item.tl : item.en
    }
  }
  return null
}

function findFaqAnswer(query: string, lang: "tl" | "en"): string | null {
  const lower = query.toLowerCase()
  const exact = faqs.find(f => f.q.toLowerCase() === lower)
  if (exact) return lang === "tl" ? (exact as any).tl : exact.a
  const fuzzy = faqs.find(f => f.q.toLowerCase().includes(lower) || lower.includes(f.q.toLowerCase().slice(0, 10)))
  if (fuzzy) return lang === "tl" ? (fuzzy as any).tl : fuzzy.a
  return null
}

function findDictionaryAnswer(query: string, lang: "tl" | "en"): string | null {
  const lower = query.toLowerCase().trim()

  const patterns: RegExp[] = [
    /what does ([a-z\s-]+) mean/i,
    /what is the meaning of ([a-z\s-]+)/i,
    /what is ([a-z\s-]+)/i,
    /define ([a-z\s-]+)/i,
    /meaning of ([a-z\s-]+)/i,
    /([a-z\s-]+) meaning/i,
    /([a-z\s-]+) definition/i,
    /ano ang ibig sabihin ng ([a-z\s-]+)/i,
    /ano ang ([a-z\s-]+)/i
  ]

  let extractedWord = ""
  for (const p of patterns) {
    const match = lower.match(p)
    if (match) {
      extractedWord = match[1].trim()
      break
    }
  }

  if (!extractedWord) return null

  const stopWords = ["your", "the", "a", "an", "this", "that", "name", "time", "weather", "today"]
  if (stopWords.includes(extractedWord)) return null

  const entry = dictionaryBase.find(e => e.word.toLowerCase() === extractedWord || lower.includes(e.word.toLowerCase()))
  if (!entry) return null

  if (lang === "tl") {
    return `📖 *${entry.word}*\n\n${entry.tl}\n\n💡 Halimbawa: ${entry.example_tl}`
  }
  return `📖 *${entry.word}*\n\n${entry.en}\n\n💡 Example: ${entry.example_en}`
}

const fallbackResponses = {
  en: "I'm an ALS learning assistant. I can answer questions about your lessons, assignments, and modules. Try asking about democracy, photosynthesis, gravity, or other topics you're studying! If you need help with the portal like passwords or submitting work, just ask.",
  tl: "Ako ay isang ALS learning assistant. Maaari akong sumagot sa mga tanong tungkol sa iyong mga aralin, assignments, at modules. Subukang magtanong tungkol sa demokrasya, photosynthesis, gravity, o iba pang paksang iyong pinag-aaralan! Kung kailangan mo ng tulong sa portal tulad ng password o pag-submit ng gawain, magtanong lamang."
}

const suggestions = [
  "How do I start a module?",
  "How are my grades computed?",
  "How do I submit an assignment?",
  "What is the passing grade?",
  "How do I reset my password?",
  "How do I switch between light and dark mode?",
  "What if I fail a module?",
  "How do I contact my teacher?"
]

interface ChatWidgetProps {
  faqMode?: boolean
}

export default function ChatWidget({ faqMode }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const addMessage = (role: string, text: string) => {
    setMessages((prev) => [...prev, { role, text }])
  }

  const sendMessage = (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    addMessage("user", msg)
    setInput("")
    setShowSuggestions(false)
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const lang = detectLanguage(msg)

      if (faqMode) {
        const dictAnswer = findDictionaryAnswer(msg, lang)
        if (dictAnswer) {
          addMessage("ai", dictAnswer)
          return
        }
        const answer = findFaqAnswer(msg, lang)
        addMessage("ai", answer ?? (lang === "tl"
          ? "Paumanhin, sa mga tanong lamang na nasa itaas ako makakasagot. Pumili po ng isa sa mga tanong."
          : "Sorry, I can only answer the questions listed above. Please pick one of the questions below."))
        return
      }

      const knowledge = findKnowledgeAnswer(msg, lang)
      if (knowledge) {
        addMessage("ai", knowledge)
        return
      }

      const faq = findFaqAnswer(msg, lang)
      if (faq) {
        addMessage("ai", faq)
        return
      }

      addMessage("ai", fallbackResponses[lang])
    }, 800 + Math.random() * 700)
  }

  const toggle = () => {
    if (!open) setOpen(true)
    else setOpen(false)
    setTimeout(() => {
      if (!open) inputRef.current?.focus()
    }, 300)
  }

  const clearChat = () => {
    setMessages([])
    setShowSuggestions(true)
  }

  return (
    <>
      <button
        className={`chat-btn${open ? " close" : ""}`}
        onClick={toggle}
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "56px", height: "56px", borderRadius: "50%",
          background: open ? "#64748b" : "#1E3A5F", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "24px", boxShadow: open
            ? "0 4px 16px rgba(100,116,139,0.35)"
            : "0 4px 16px rgba(30,58,95,0.35)",
          cursor: "pointer", zIndex: 100, border: "none"
        }}
      >
        {open ? (
          <i className="fas fa-times" />
        ) : (
          <img src="/img/bot.png" alt="Bot" className="w-10 h-10" />
        )}
      </button>

      <div
        className="chat-box"
        style={{
          position: "fixed", bottom: "92px", right: "24px",
          width: "360px", height: "520px",
          background: "var(--card-bg)", borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", zIndex: 99,
          overflow: "hidden",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(16px) scale(0.96)",
          pointerEvents: open ? "all" : "none",
          transition: "opacity 0.3s, transform 0.3s"
        }}
      >
        <div style={{
          padding: "16px 20px", background: "#1E3A5F", color: "#fff",
          display: "flex", alignItems: "center", gap: "12px", flexShrink: 0
        }}>
          <img src="/img/bot.png" alt="Bot" className="w-8 h-8" />
          <div className="flex-1">
            <h3 style={{ fontSize: "15px", fontWeight: 600 }}>AI Assistant</h3>
            <p style={{ fontSize: "11px", opacity: 0.7 }}>Online • Understands English & Tagalog</p>
          </div>
          <button onClick={clearChat} style={{
            background: "rgba(255,255,255,0.15)", border: "none",
            color: "#fff", borderRadius: "8px", padding: "6px 10px",
            fontSize: "11px", cursor: "pointer"
          }}>
            <i className="fas fa-rotate-right" /> Clear
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: "auto", padding: "16px",
          display: "flex", flexDirection: "column", gap: "10px"
        }}>
          {messages.length === 0 && showSuggestions && (
            <div style={{
              display: "flex", flexDirection: "column", gap: "6px", padding: "4px 0 8px"
            }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                {faqMode ? "Select or type a question:" : "Try asking about:"}
              </p>
              {suggestions.map((q) => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  padding: "10px 14px", borderRadius: "10px",
                  border: "1px solid var(--border)", fontSize: "12px",
                  background: "var(--card-bg)", color: "var(--text-primary)",
                  cursor: "pointer", textAlign: "left", lineHeight: 1.3
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role}`} style={{
              display: "flex", alignItems: "flex-end", gap: "8px",
              maxWidth: "90%",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              flexDirection: msg.role === "user" ? "row-reverse" : "row"
            }}>
              <div className="msg-avatar" style={{
                width: "28px", height: "28px", borderRadius: "50%",
                flexShrink: 0, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "11px",
                background: msg.role === "ai" ? "#e2e8f0" : "#1E3A5F",
                color: msg.role === "ai" ? "#1E3A5F" : "#fff"
              }}>
                <i className={`fas fa-${msg.role === "ai" ? "robot" : "user"}`} />
              </div>
              <div className="msg-bubble" style={{
                padding: "10px 14px", borderRadius: "14px",
                fontSize: "13px", lineHeight: 1.45, wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                background: msg.role === "user" ? "#1E3A5F" : "#f1f5f9",
                color: msg.role === "user" ? "#fff" : "#1e293b",
                borderBottomRightRadius: msg.role === "user" ? "4px" : "14px",
                borderBottomLeftRadius: msg.role === "ai" ? "4px" : "14px"
              }}>
                {msg.text}
              </div>
            </div>
          ))}

          {typing && (
            <div className="typing-indicator show" style={{
              display: "flex", alignItems: "center", gap: "8px", alignSelf: "flex-start"
            }}>
              <div className="msg-avatar ai" style={{
                width: "28px", height: "28px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", background: "#e2e8f0", color: "#1E3A5F"
              }}>
                <i className="fas fa-robot" />
              </div>
              <div className="typing-dots" style={{
                display: "flex", gap: "4px", padding: "10px 16px",
                background: "#f1f5f9", borderRadius: "14px",
                borderBottomLeftRadius: "4px"
              }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: "#94a3b8",
                    animation: "dotPulse 1.2s ease infinite",
                    animationDelay: `${i * 0.2}s`
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="chat-input" style={{
          display: "flex", gap: "8px", padding: "12px 16px",
          borderTop: "1px solid var(--border)", flexShrink: 0
        }}>
          <input
            ref={inputRef}
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={faqMode ? "Type a question..." : "Ask in English or Tagalog..."}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "10px",
              border: "1px solid var(--border)", fontSize: "13px",
              outline: "none", background: "var(--input-bg)", color: "var(--text-primary)"
            }}
          />
          <button onClick={() => sendMessage()} disabled={typing || !input.trim()} style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "#1E3A5F", color: "#fff", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "15px", flexShrink: 0,
            opacity: typing || !input.trim() ? 0.5 : 1
          }}>
            <i className="fas fa-paper-plane" />
          </button>
        </div>
      </div>
    </>
  )
}