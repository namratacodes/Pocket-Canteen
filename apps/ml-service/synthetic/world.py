"""All tunable assumptions of the synthetic campus in ONE place."""
CANTEEN_PROFILES = {            # token prefix -> (weekday orders/day, kitchen capacity multiplier)
    "A": (230, 1.0), "B": (170, 0.9), "C": (130, 0.8), "D": (90, 0.7), "E": (60, 0.6)}
BASE_SLOTS = {"griddle": 4, "fryer": 2, "wok": 2, "beverage": 3, "main_counter": 3}   # parallel cooks per station
ARRIVAL_MIX = [            # (weight, mean minute-of-day, sd minutes): breakfast, mid-morning, lunch, tea, evening
    (.12, 9 * 60, 40), (.10, 11 * 60, 45), (.40, 13 * 60 + 15, 35), (.28, 16 * 60 + 30, 40), (.10, 19 * 60 + 30, 60)]
DOW_FACTOR = [1.0, 1.0, 1.0, 1.0, 1.0, 0.45, 0.12]            # Mon..Sun
CAL_FACTOR = {0: 1.0, 1: 0.8, 2: 0.25}                        # regular, exam week, holiday/fest
POPULARITY = {                  # item name -> weight per daypart [breakfast, lunch, tea, evening]
    "Samosa": [2, 2, 5, 3], "Tea": [4, 2, 6, 3], "Coffee": [3, 2, 3, 2], "Cold Coffee": [1, 3, 3, 3],
    "Veg Sandwich": [3, 3, 2, 2], "Grilled Sandwich": [1, 3, 3, 2], "Masala Dosa": [3, 5, 1, 1],
    "Veg Burger": [1, 4, 3, 3], "Chicken Burger": [.5, 3, 2, 3], "Veg Fried Rice": [.2, 5, 1, 3],
    "Maggi": [1, 2, 2, 4], "French Fries": [1, 2, 3, 3]}
AFFINITY = {                    # planted combos the basket analysis should rediscover
    "Samosa": [("Tea", .45)], "Grilled Sandwich": [("Cold Coffee", .35)], "Veg Burger": [("French Fries", .40)],
    "Chicken Burger": [("French Fries", .40)], "Maggi": [("Cold Coffee", .25)], "Masala Dosa": [("Coffee", .30)]}
EXTRA_ITEM_PROB = 0.22
QTY_CHOICES, QTY_PROBS = [1, 2, 3], [.82, .15, .03]
EXAM_WEEK_EVERY = 9             # every 9th week is an exam week
