import yaml
import re
from typing import List, Dict

class ItemQuantity:
    def __init__(self, name: str, quantity: int):
        self.name = name
        self.quantity = quantity

    def to_dict(self) -> Dict:
        return {"name": self.name, "quantity": self.quantity}

    @staticmethod
    def from_dict(source: Dict):
        return ItemQuantity(source['name'], source['quantity'])

    def __str__(self):
        return f'ItemQuantity(name={self.name}, quantity={self.quantity})'

    def __repr__(self):
        return self.__str__()

class CraftingRecipe:
    def __init__(self, items: List[ItemQuantity], stations: List[str]):
        self.items = items
        self.stations = stations

    def to_dict(self) -> Dict:
        return {"items": [item.to_dict() for item in self.items], "stations": self.stations}

    @staticmethod
    def from_dict(source: Dict):
        items = [ItemQuantity.from_dict(item) for item in source['items']]
        return CraftingRecipe(items, source['stations'])

    def __str__(self):
        return f'CraftingRecipe(items={self.items}, stations={self.stations})'

    def __repr__(self):
        return self.__str__()

class InventoryItem:
    def __init__(self, name: str, title: str, crafting: List[CraftingRecipe]):
        self.name = name
        self.title = title
        self.crafting = crafting

    def to_dict(self) -> Dict:
        return {"name": self.name, "title": self.title, "crafting": [craft.to_dict() for craft in self.crafting]}

    @staticmethod
    def from_dict(source: Dict):
        crafting = [CraftingRecipe.from_dict(craft) for craft in source['crafting']]
        return InventoryItem(source['name'], source['title'], crafting)

    def __str__(self):
        return f'InventoryItem(name={self.name}, title={self.title}, crafting={self.crafting})'

    def __repr__(self):
        return self.__str__()


# Define some basic crafting rules
crafting_rules = {
    'Wood Log': [{'name': 'Wood Plank', 'quantity': 4}, {'name': 'Wood Stick', 'quantity': 10}],
    'Potato': [{'name': 'Baked Potato', 'quantity': 1}],
    'Raw Iron': [{'name': 'Iron Ingot', 'quantity': 1}],
    'Raw Gold': [{'name': 'Gold Ingot', 'quantity': 1}],
    'Wood Plank': [{'name': 'Small Wooden Chest', 'quantity': 1}, {'name': 'Wooden Chest', 'quantity': 2}],
    'Fur': [{'name': 'Fur Sword', 'quantity': 1}, {'name': 'Fur Helmet', 'quantity': 1}, {'name': 'Fur Coat', 'quantity': 1}],
    'Flint': [{'name': 'Flint\'n\'Steel', 'quantity': 1}],
    'Empty Bottle': [{'name': 'Small Water Bottle', 'quantity': 1}, {'name': 'Bottle of Wodka', 'quantity': 1}],
    'Cloth': [{'name': 'Small Tent', 'quantity': 1}, {'name': 'Medium Tent', 'quantity': 2}, {'name': 'Large Tent', 'quantity': 3}],
    'Ice Shard': [{'name': 'Snow Ball', 'quantity': 2}],
    'Wood Stick': [{'name': 'Shovel', 'quantity': 1, 'additional_items': [{'name': 'Iron Ingot', 'quantity': 1}]}, 
                   {'name': 'Pickaxe', 'quantity': 1, 'additional_items': [{'name': 'Iron Ingot', 'quantity': 1}]}],
    'Iron Ingot': [{'name': 'Shovel', 'quantity': 1, 'additional_items': [{'name': 'Wood Stick', 'quantity': 2}]}, 
                   {'name': 'Pickaxe', 'quantity': 1, 'additional_items': [{'name': 'Wood Stick', 'quantity': 2}]}],
    
    'Raw Copper': [{'name': 'Copper Ingot', 'quantity': 1}],
    'Copper Ingot': [{'name': 'Bronze Ingot', 'quantity': 1, 'additional_items': [{'name': 'Tin Ingot', 'quantity': 1}]}],
    'Raw Gold': [{'name': 'Gold Ingot', 'quantity': 1}],
    'Raw Fotrite': [{'name': 'Fotrite Ingot', 'quantity': 1}],
    'Fotrite Ingot': [{'name': 'Fotrite Shovel', 'quantity': 1, 'additional_items': [{'name': 'Wood Stick', 'quantity': 2}]}, 
                      {'name': 'Fotrite Pickaxe', 'quantity': 1, 'additional_items': [{'name': 'Wood Stick', 'quantity': 2}]}],
    'Ulerium Ingot': [{'name': 'Wormhole Generator', 'quantity': 1, 'additional_items': [{'name': 'Circuitry', 'quantity': 1}, 
                                                                                          {'name': 'Wire', 'quantity': 2}, 
                                                                                             {'name': 'Ion Cube', 'quantity': 3}]}],
     
}


def to_name(title):
    return re.sub(r'\W+', '_', title.lower())


if __name__ == "__main__":




    # Open and read the YAML file
    with open('items.yaml', 'r') as file:
        items = yaml.safe_load(file)

    # Process each item
    out = []
    for item in items:
        title = item['title']

        crafting = crafting_rules.get(title, None)
        print("Can be crafted: ", item, crafting)
        rec = []
        if crafting is not None:
            for c in crafting:                
                what = c["name"]
                how_many = c["quantity"]
                from_what = [ItemQuantity(to_name(title), 1)] + [ItemQuantity(to_name(iq["name"]), iq["quantity"]) for iq in c.get("additional_items", [])]
                print(what, how_many, from_what)
                rec.append(CraftingRecipe(from_what, ["workbench"]))
        

        # Convert to lowercase and replace spaces and punctuations with _
        name = re.sub(r'\W+', '_', title.lower())
        # Replace the title attribute with the name attribute
        item = InventoryItem(name, title, rec)
        out.append(item)
        print(item)


    # Write the processed items back to a new YAML file
    with open('items-names.yaml', 'w') as file:
        yaml.safe_dump([o.to_dict() for o in out], file)