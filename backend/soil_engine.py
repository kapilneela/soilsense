"""
SoilSense Soil Intelligence Engine
Provides comprehensive agronomic profiles and hydraulic characteristics for agricultural soil classifications.
"""

from typing import Dict, List, Optional
from models import SoilProfile

SOIL_DATABASE: Dict[str, SoilProfile] = {
    "sandy": SoilProfile(
        id="sandy",
        name="Sandy Soil",
        description="Light, gritty-textured soil composed of coarse mineral particles with large pore spaces.",
        particle_characteristics="Coarse particles (0.05 - 2.0 mm), low cohesion, highly permeable with minimal plasticity.",
        water_retention_capacity="Low (typically 0.7 - 1.2 inches of available water per foot of soil). Rapid infiltration rates exceeding 25 mm/hr.",
        drainage_characteristics="Excessive and rapid drainage. Gravitational water percolates swiftly beyond the root zone.",
        aeration_characteristics="Excellent macropore aeration; risk of hypoxia is practically non-existent.",
        fertility_characteristics="Low cation exchange capacity (CEC 1-5 meq/100g). Nutrients leach rapidly with percolating water.",
        organic_matter="Typically low (<1.5%), decomposes quickly due to high soil oxygen levels and elevated temperatures.",
        common_applications="Root vegetables (carrots, radishes), drought-tolerant tubers, watermelon, groundnut, and early spring planting.",
        advantages=[
            "Warms up rapidly in spring, accelerating early seed germination",
            "Effortless tillage and root penetration with zero crusting",
            "Negligible risk of root rot or waterlogging during heavy precipitation"
        ],
        limitations=[
            "Extremely low water holding capacity requires frequent irrigation cycles",
            "Severe nutrient leaching (nitrogen and potassium leach readily)",
            "Prone to rapid drought stress under solar heat"
        ],
        suitable_crops=["Watermelon", "Groundnut", "Potato", "Cucumber", "Pearl millet", "Carrot"],
        irrigation_considerations="Requires frequent, low-volume pulse irrigation (drip method is optimal). High-volume flood irrigation causes massive deep percolation and nutrient loss. Hysteresis should be set tight to prevent moisture falling below 35%.",
        field_capacity_pct=15.0,
        wilting_point_pct=6.0
    ),
    "clay": SoilProfile(
        id="clay",
        name="Clay Soil",
        description="Heavy, dense soil composed of microscopic mineral platelets with exceptionally high moisture and nutrient retention.",
        particle_characteristics="Microscopic particles (<0.002 mm), high plasticity when wet, hard and cracked when dry.",
        water_retention_capacity="Very High (2.0 - 2.5 inches of available water per foot of soil). Extremely slow infiltration (1 - 5 mm/hr).",
        drainage_characteristics="Poor to very poor. Susceptible to surface ponding, waterlogging, and prolonged anaerobic conditions.",
        aeration_characteristics="Poor aeration due to predominance of micropores. Restricted oxygen diffusion to deep roots when saturated.",
        fertility_characteristics="High cation exchange capacity (CEC 25-50 meq/100g). Retains calcium, magnesium, potassium, and trace elements well.",
        organic_matter="Moderate to high; organic matter decomposition is slower due to limited internal aeration.",
        common_applications="Wetland rice cultivation, brassicas, deep-rooted perennials, cotton, and heavy grain production.",
        advantages=[
            "Exceptional nutrient buffer prevents fertilizer leaching",
            "Holds moisture for extended periods, reducing required watering frequency",
            "Anchors deep plant root systems firmly"
        ],
        limitations=[
            "Slow to warm in spring, delaying planting schedules",
            "Severe risk of compaction and soil crusting",
            "High susceptibility to root asphyxiation if overwatered"
        ],
        suitable_crops=["Rice", "Wheat", "Cotton", "Sugarcane", "Cabbage", "Brinjal"],
        irrigation_considerations="Requires slow application rates below the soil infiltration capacity to avoid surface runoff. Allow adequate drying cycles between watering to permit soil aeration. Avoid frequent short pulses.",
        field_capacity_pct=38.0,
        wilting_point_pct=20.0
    ),
    "loamy": SoilProfile(
        id="loamy",
        name="Loamy Soil",
        description="The ideal agricultural balance of sand (approx 40%), silt (approx 40%), and clay (approx 20%).",
        particle_characteristics="Balanced blend of coarse and fine mineral particles creating granular crumb structure.",
        water_retention_capacity="Optimal (1.5 - 2.2 inches of available water per foot). Balanced infiltration rate (10 - 20 mm/hr).",
        drainage_characteristics="Moderate, well-regulated drainage. Discharges gravitational water while retaining capillary water.",
        aeration_characteristics="Well-balanced ratio of macropores and micropores ensures abundant root respiration.",
        fertility_characteristics="Moderate to high cation exchange capacity (CEC 15-25 meq/100g) with high nutrient bioavailability.",
        organic_matter="Typically rich (3% - 5%), actively supporting diverse microbial and earthworm activity.",
        common_applications="High-value horticulture, orchard cultivation, intensive vegetable production, and staple cereals.",
        advantages=[
            "Optimal moisture storage without prolonged saturation",
            "Superior tilth, workable under wide moisture ranges",
            "Universal compatibility with virtually all commercial agricultural crops"
        ],
        limitations=[
            "Can still suffer from plow pan compaction if worked when wet",
            "Requires organic replenishment to maintain optimal crumb structure"
        ],
        suitable_crops=["Tomato", "Potato", "Onion", "Maize", "Wheat", "Papaya", "Pomegranate", "Banana", "Grapes"],
        irrigation_considerations="Forgiving and versatile. Responds smoothly to standard drip and micro-sprinkler regimes. Target moisture levels around 60-70% of available capacity.",
        field_capacity_pct=28.0,
        wilting_point_pct=12.0
    ),
    "silty": SoilProfile(
        id="silty",
        name="Silty Soil",
        description="Smooth, floury-feeling soil dominated by intermediate-sized particles, common in river valleys and floodplains.",
        particle_characteristics="Intermediate particles (0.002 - 0.05 mm), silky texture, moderate plasticity and cohesiveness.",
        water_retention_capacity="High (2.0 - 2.4 inches per foot). Slower infiltration than loam, prone to capping under impact.",
        drainage_characteristics="Moderate to slow. Retains moisture effectively but can develop drainage resistance if compacted.",
        aeration_characteristics="Moderate aeration; can suffer from restricted gas exchange if droplet impact creates surface crusts.",
        fertility_characteristics="High native fertility due to sedimentary mineral deposition. Moderate CEC (12-20 meq/100g).",
        organic_matter="Moderate (2% - 4%), readily incorporated into aggregates.",
        common_applications="Floodplain farming, perennial fruit trees, leafy greens, root vegetables, and moisture-loving grains.",
        advantages=[
            "High moisture retention reduces drought vulnerability",
            "Smooth workable consistency with naturally high fertility",
            "Supports fast seedling establishment when uncrusted"
        ],
        limitations=[
            "Highly vulnerable to surface crusting under overhead sprinkler impact",
            "Prone to wind and water erosion on sloped terrains"
        ],
        suitable_crops=["Spinach", "Tomato", "Wheat", "Rice", "Banana", "Cucumber"],
        irrigation_considerations="Drip irrigation with low-pressure emitters is highly recommended to protect against aggregate breakdown and surface crust formation.",
        field_capacity_pct=32.0,
        wilting_point_pct=15.0
    ),
    "sandy_loam": SoilProfile(
        id="sandy_loam",
        name="Sandy Loam",
        description="Loam with an increased fraction of sand (50-70%), combining rapid drainage with respectable moisture retention.",
        particle_characteristics="Predominantly sandy feel with sufficient silt and clay to form friable, stable aggregates.",
        water_retention_capacity="Moderate (1.2 - 1.6 inches per foot). Infiltration rate 15 - 25 mm/hr.",
        drainage_characteristics="Good to rapid drainage. Seldom waterlogs; excess rain sheds quickly.",
        aeration_characteristics="Excellent root aeration with active soil gas renewal.",
        fertility_characteristics="Moderate CEC (8-15 meq/100g). Responds rapidly to organic and soluble fertilizer applications.",
        organic_matter="Moderate (2% - 3.5%), requiring regular additions of compost or cover crops.",
        common_applications="Commercial market gardening, greenhouse vegetable production, strawberries, solanaceous crops.",
        advantages=[
            "Fastest draining loamy class that still preserves adequate crop moisture",
            "Ideal root environment for high-value fruiting vegetables",
            "Warms quickly in spring without drying out as abruptly as pure sand"
        ],
        limitations=[
            "Requires more monitoring during intense heat waves than heavy soils",
            "Moderate leaching of nitrates during sustained monsoon or overhead flooding"
        ],
        suitable_crops=["Tomato", "Chilli", "Brinjal", "Potato", "Onion", "Grapes", "Watermelon", "Soybean"],
        irrigation_considerations="Ideal for automated precision drip systems. Maintain consistent medium-frequency irrigation cycles. Ensure hysteresis allows cycling before plant experiences moisture depletion.",
        field_capacity_pct=22.0,
        wilting_point_pct=9.0
    ),
    "red": SoilProfile(
        id="red",
        name="Red Soil",
        description="Iron-rich, oxidic tropical and subtropical soil developed over crystalline crystalline rocks.",
        particle_characteristics="Rich in ferric oxides (hematite/goethite), porous, friable to crumbly texture.",
        water_retention_capacity="Low to moderate (1.0 - 1.4 inches per foot). Rapid surface infiltration but variable subsoil density.",
        drainage_characteristics="Generally good internal drainage, though can form an indurated subsurface lateritic hardpan.",
        aeration_characteristics="Good aeration in topsoil layers. Root respiration is generally unrestricted.",
        fertility_characteristics="Typically low in nitrogen, phosphorus, and organic carbon; slightly acidic (pH 5.5 - 6.5).",
        organic_matter="Generally low (<1.0% in warm tropical zones due to fast bio-oxidation).",
        common_applications="Groundnut cultivation, pulses, millets, cotton, oilseeds, and mango orchards.",
        advantages=[
            "High iron and manganese availability for acid-tolerant crops",
            "Does not swell or shrink excessively, preventing root shearing",
            "Good physical structure allows rapid root penetration"
        ],
        limitations=[
            "Fixes soluble phosphorus into insoluble iron phosphates",
            "Low water retention requires structured irrigation scheduling",
            "Prone to soil erosion during intense monsoon downpours"
        ],
        suitable_crops=["Groundnut", "Pearl millet", "Sorghum", "Cotton", "Mango", "Pomegranate", "Turmeric"],
        irrigation_considerations="Needs controlled periodic watering. Do not let top layers bake dry under intense sun. Mulching combined with drip irrigation provides the highest water-use efficiency.",
        field_capacity_pct=20.0,
        wilting_point_pct=8.0
    ),
    "black": SoilProfile(
        id="black",
        name="Black Soil (Regur / Vertisol)",
        description="Montmorillonite-rich vertisol known for dramatic swelling when wet and deep cracking when dry.",
        particle_characteristics="High smectite clay content (>45%), highly colloidal, self-mulching surface dynamics.",
        water_retention_capacity="Extremely High (2.2 - 2.8 inches per foot). Very low hydraulic conductivity when saturated.",
        drainage_characteristics="Poor internal drainage. Forms an impervious barrier once swelling shuts cracks.",
        aeration_characteristics="Restricted when swollen wet; high gas exchange through cracks during dry phases.",
        fertility_characteristics="Very high cation exchange capacity (CEC 35-65 meq/100g). Rich in calcium, magnesium, and potassium.",
        organic_matter="Moderate (1.5% - 3.0%), stable organic-mineral complexes.",
        common_applications="Cash crops (Cotton, Sugarcane), rainfed winter wheat, sorghum, soybean, and chickpeas.",
        advantages=[
            "Retains deep moisture for months, supporting dry-season rabi crops",
            "High native fertility significantly cuts synthetic fertilizer demand",
            "Self-churning action incorporates surface residues naturally"
        ],
        limitations=[
            "Extremely narrow workable moisture window (sticky when wet, unworkably hard when dry)",
            "Shrink-swell cycle can shear root filaments if subjected to severe drying cycles"
        ],
        suitable_crops=["Cotton", "Sugarcane", "Soybean", "Wheat", "Sorghum", "Pomegranate"],
        irrigation_considerations="Avoid over-saturating. Apply irrigation before deep shrinkage cracks develop to protect roots. Use wide hysteresis bands to accommodate naturally high retention.",
        field_capacity_pct=42.0,
        wilting_point_pct=22.0
    ),
    "peaty": SoilProfile(
        id="peaty",
        name="Peaty / Organic Soil",
        description="Dark, sponge-like soil containing more than 20% partially decayed organic matter (Histosol).",
        particle_characteristics="Fibrous to sapric organic fibers, extremely light bulk density, spongy elasticity.",
        water_retention_capacity="Exceptional gravimetric water absorption (often holding 200% to 400% of its dry weight in water).",
        drainage_characteristics="Can retain water to saturation. Requires structured sub-surface drainage in wetland settings.",
        aeration_characteristics="Poor when waterlogged, but becomes open and well-aerated when properly drained.",
        fertility_characteristics="Very high total nitrogen, but often locked organically. Highly acidic (pH 3.8 - 5.5), deficient in copper.",
        organic_matter="Very High (>25%), predominantly humic and fulvic complexes.",
        common_applications="Specialty crops (blueberries, cranberries, brassicas), container potting media, root nurseries.",
        advantages=[
            "Immense moisture holding capacity prevents quick drying in containers",
            "Soft, pliable matrix permits extensive fibrous root growth",
            "Outstanding buffer against temperature fluctuations"
        ],
        limitations=[
            "Strong acidity often requires liming for general agronomy",
            "Can become hydrophobic if allowed to bake completely dry",
            "Trace mineral deficiencies (copper, zinc, boron) are common"
        ],
        suitable_crops=["Potato", "Spinach", "Cabbage", "Cucumber", "Tomato", "Cauliflower"],
        irrigation_considerations="Never allow peaty soil to desiccate entirely, as rewetted peat can exhibit severe hydrophobicity. Maintain consistent baseline moisture with light, rhythmic pulse irrigation.",
        field_capacity_pct=50.0,
        wilting_point_pct=26.0
    )
}

def get_all_soils() -> List[SoilProfile]:
    return list(SOIL_DATABASE.values())

def get_soil_by_id(soil_id: str) -> Optional[SoilProfile]:
    return SOIL_DATABASE.get(soil_id.lower().replace(" ", "_"))
