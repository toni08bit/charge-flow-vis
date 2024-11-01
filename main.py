import math
import PIL.Image
import PIL.ImageDraw
import PIL.ImageFont

config = {
    "charges": {
        "positive": [
            [1100,1100],
            [900,900]
        ],
        "negative": [
            [900,1100],
            [1100,900]
        ]
    },
    "start_positive": True,
    "symbol_radius": 10,
    "step_size": 2,
    "no_reduction_max": 1000,
    "line_color": (0,0,0),
    "deg_step": 15,
    "safe_iterations": 10000
}

new_img = PIL.Image.new("RGB",(2000,2000),(255,255,255))
draw = PIL.ImageDraw.Draw(new_img)

def draw_charge_circles():
    for positive_charge in config["charges"]["positive"]:
        draw.ellipse(
            (
                (positive_charge[0] - config["symbol_radius"]),
                (positive_charge[1] - config["symbol_radius"]),
                (positive_charge[0] + config["symbol_radius"]),
                (positive_charge[1] + config["symbol_radius"])
            ),
            fill = (255,0,0),
            outline = (0,0,0)
        )
    for negative_charge in config["charges"]["negative"]:
        draw.ellipse(
            (
                (negative_charge[0] - config["symbol_radius"]),
                (negative_charge[1] - config["symbol_radius"]),
                (negative_charge[0] + config["symbol_radius"]),
                (negative_charge[1] + config["symbol_radius"])
            ),
            fill = (0,0,255),
            outline = (0,0,0)
        )

def calculate_field_vector(x,y):
    fx = 0
    fy = 0
    for charge_type,points in config["charges"].items():
        for pos in points:
            dx = (pos[0] - x)
            dy = (pos[1] - y)
            distance_sq = (dx ** 2 + dy ** 2)
            if (distance_sq == 0):
                continue
            force_magnitude = (1 / distance_sq)  # Inverse square law
            if (charge_type == "positive"):
                direction = 1
            elif (charge_type == "negative"):
                direction = -1
            fx = (fx + (direction * force_magnitude * (dx / math.sqrt(distance_sq))))
            fy = (fy + (direction * force_magnitude * (dy / math.sqrt(distance_sq))))
    return fx,fy

def draw_field_line(x,y,reverse):
    points = []
    width,height = new_img.size
    steps_without_reduction = 0
    previous_norm = float("inf")

    for i in range(10000):
        if (not ((0 <= (x < width)) and (0 <= (y < height)))):
            break

        fx,fy = calculate_field_vector(x,y)
        norm = math.sqrt(fx ** 2 + fy ** 2)
        if (norm == 0):
            break
        if (reverse):
            x = (x - (config["step_size"] * fx / norm))
            y = (y - (config["step_size"] * fy / norm))
        else:
            x = (x + (config["step_size"] * fx / norm))
            y = (y + (config["step_size"] * fy / norm))
        points.append((x,y))
        
        for charge_type,positions in config["charges"].items():
            for pos in positions:
                if (math.sqrt((x - pos[0]) ** 2 + (y - pos[1]) ** 2) < config["step_size"]):
                    draw.line(
                        points,
                        fill = (0,0,0),
                        width = 2
                    )
                    return
        
        if (norm >= previous_norm):
            steps_without_reduction = (steps_without_reduction + 1)
        else:
            steps_without_reduction = 0
        previous_norm = norm
        if (steps_without_reduction >= config["no_reduction_max"]):
            break
    draw.line(
        points,
        fill = config["line_color"],
        width = 2
    )

def draw_field_lines_around_charges():
    if (config["start_positive"]):
        relevant_charges = config["charges"]["positive"]
    else:
        relevant_charges = config["charges"]["negative"]
    for pos in relevant_charges:
        for angle in range(0,360,config["deg_step"]):
            radians = math.radians(angle)
            x = (pos[0] + math.cos(radians) * 1)
            y = (pos[1] + math.sin(radians) * 1)
            draw_field_line(x,y,config["start_positive"])

draw_field_lines_around_charges()
draw_charge_circles()

new_img.show()
