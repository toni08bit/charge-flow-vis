const config = {
    "start_positive": true,
    "indicator_enabled": true,
    "symbol_radius": 10,
    "step_size": 5,
    "indicator_distance": 250,
    "outer_max_steps": 1000,
    "inner_max_steps": 10000,
    "deg_step": 10,
    "colors": {
        "line": [0,0,0],
        "arrow": [0,0,0],
        "positive": [255,0,0],
        "negative": [0,0,255]
    },
    "line_width": 1
}

let charges = {
    "positive": [],
    "negative": []
}
let resolution = [0,0]
let mouse_pos = [0,0]
let canvas = null
let ctx = null


// General
function on_init() {
    canvas = document.getElementById("viewport")
    ctx = canvas.getContext("2d")

    canvas.addEventListener("mousemove",function(event) {
        mouse_pos = [
            event.clientX,
            event.clientY
        ]
    })
    window.addEventListener("resize",update_resolution)
    window.addEventListener("keydown",function(event) {
        if (event.code == "KeyR") {
            charges.positive = []
            charges.negative = []
        } else if (event.code == "KeyW") {
            charges.positive.push(mouse_pos)
        } else if (event.code == "KeyE") {
            charges.negative.push(mouse_pos)
        } else {
            return
        }
        render()
    })

    update_resolution()
}

function update_resolution() {
    let client_rect = canvas.getBoundingClientRect()
    resolution = [
        client_rect.width,
        client_rect.height
    ]
    canvas.setAttribute("width",resolution[0])
    canvas.setAttribute("height",resolution[1])
    render()
}

// Render
function render() {
    ctx.fillStyle = "rgba(0,255,0,0.1)"
    ctx.fillRect(0,0,resolution[0],resolution[1])
    setTimeout(function() {
        ctx.fillStyle = "rgb(255,255,255)"
        ctx.fillRect(0,0,resolution[0],resolution[1])
        
        spread_from_charges()
        for (let charge_entry of Object.entries(charges)) {
            for (let pos of charge_entry[1]) {
                if (charge_entry[0] == "positive") {
                    ctx.fillStyle = "rgb(%r,%g,%b)".replace("%r",config.colors.positive[0]).replace("%g",config.colors.positive[1]).replace("%b",config.colors.positive[2])
                } else {
                    ctx.fillStyle = "rgb(%r,%g,%b)".replace("%r",config.colors.negative[0]).replace("%g",config.colors.negative[1]).replace("%b",config.colors.negative[2])
                }
                ctx.beginPath()
                ctx.arc(pos[0],pos[1],config.symbol_radius,0,(2 * Math.PI))
                ctx.fill()
            }
        }
    },0)

}

let charge_hits = {}
function spread_from_charges() {
    charge_hits = {}
    let primary_array = null
    let secondary_array = null
    if (config.start_positive) {
        primary_array = charges.positive
        secondary_array = charges.negative
    } else {
        primary_array = charges.negative
        secondary_array = charges.positive
    }
    for (let pos of primary_array) {
        for (let angle = 0;(angle < 360);(angle = (angle + config.deg_step))) {
            let rad_step = (angle * Math.PI / 180)
            draw_line_path(
                (pos[0] + Math.cos(rad_step)),
                (pos[1] + Math.sin(rad_step)),
                (!config.start_positive),
                false
            )
        }
    }
    for (let pos of secondary_array) {
        let hits = charge_hits[pos.toString()]
        if (!hits) {
            hits = []
        }
        let hit_gaps = deg_gap(hits)
        for (let gap of hit_gaps) {
            if (gap[1] <= gap[0]) {
                gap[1] = (gap[1] + 360)
            }
            let gap_size = (gap[1] - gap[0])
            if (gap_size <= config.deg_step) {
                continue
            }
            let gap_points = Math.floor(gap_size / config.deg_step)
            for (let i = 0;(i < gap_points);i++) {
                let point_rad = ((gap[0] + i * (gap_size / gap_points)) * Math.PI / 180)
                if ((i === 0) && (point_rad !== 0)) {
                    continue
                }
                draw_line_path(
                    (pos[0] + Math.cos(point_rad)),
                    (pos[1] + Math.sin(point_rad)),
                    config.start_positive,
                    true
                )
            }
        }
    }
}

function draw_line_path(x,y,reverse,freeze_arrays) {
    let x_pos = x
    let y_pos = y
    let outer_steps_remaining = config.outer_max_steps
    let inner_steps_remaining = config.inner_max_steps

    ctx.beginPath()
    ctx.moveTo(x_pos,y_pos)
    let indicator_pos = []
    let move_path = false
    let prev_pos = null
    let indicator_distance_left = config.indicator_distance
    while ((outer_steps_remaining > 0) && (inner_steps_remaining > 0)) {
        let [fx,fy] = calculate_field_vector(x_pos,y_pos)
        let normal = Math.sqrt(fx ** 2 + fy ** 2)
        if (normal == 0) {
            break
        }
        let dx = (config.step_size * fx / normal)
        let dy = (config.step_size * fy / normal)
        prev_pos = [x_pos,y_pos]
        if (reverse) {
            x_pos = (x_pos + dx)
            y_pos = (y_pos + dy)
        } else {
            x_pos = (x_pos - dx)
            y_pos = (y_pos - dy)
        }
        let distance = Math.sqrt(dx ** 2 + dy ** 2)
        indicator_distance_left = (indicator_distance_left - distance)
        if (indicator_distance_left < 0) {
            indicator_distance_left = config.indicator_distance
            indicator_pos.push([
                x_pos,
                y_pos,
                Math.atan2(-dy,-dx)
            ])
        }
        if ((x_pos >= 0) && (x_pos < resolution[0]) && (y_pos >= 0) && (y_pos < resolution[1])) {
            if (move_path) {
                if (prev_pos) {
                    ctx.moveTo(prev_pos[0],prev_pos[1])
                } else {
                    ctx.moveTo(x_pos,y_pos)
                }
                move_path = false
            }
            if ((!move_path) || (move_path && prev_pos)) {
                ctx.lineTo(x_pos,y_pos)
            }
        } else {
            move_path = true
            outer_steps_remaining = (outer_steps_remaining - 1)
        }
        inner_steps_remaining = (inner_steps_remaining - 1)

        let escape = false
        for (let charge_entry of Object.entries(charges)) {
            for (let pos of charge_entry[1]) {
                let charge_dx = (x_pos - pos[0])
                let charge_dy = (y_pos - pos[1])
                if (Math.sqrt(charge_dx ** 2 + charge_dy ** 2) <= config.step_size) {
                    if (!freeze_arrays) {
                        let entry_angle = (Math.atan2(-charge_dy,-charge_dx) / Math.PI * 180 + 180)
                        let pos_string = pos.toString()
                        if (charge_hits[pos_string] === undefined) {
                            charge_hits[pos_string] = []
                        }
                        charge_hits[pos_string].push(entry_angle)
                    }
                    escape = true
                    break
                }
            }
            if (escape) {
                break
            }
        }
        if (escape) {
            break
        }
    }
    ctx.lineWidth = config.line_width
    ctx.strokeStyle = "rgb(%r,%g,%b)".replace("%r",config.colors.line[0]).replace("%g",config.colors.line[1]).replace("%b",config.colors.line[2])
    ctx.stroke()

    if (config.indicator_enabled) {
        for (let arrow of indicator_pos) {
            draw_indicator(arrow[0],arrow[1],arrow[2])
        }
    }
}

function draw_indicator(x,y,angle) {
    ctx.save()
    ctx.translate(x,y)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.moveTo(0,0)
    ctx.lineTo(
        (-config.symbol_radius),
        (config.symbol_radius / 2)
    )
    ctx.lineTo(
        (-config.symbol_radius),
        (-config.symbol_radius / 2)
    )
    ctx.closePath()
    ctx.fillStyle = "rgb(%r,%g,%b)".replace("%r",config.colors.arrow[0]).replace("%g",config.colors.arrow[1]).replace("%b",config.colors.arrow[2])
    ctx.fill()
    ctx.restore()
}

// Calculations
function calculate_field_vector(x,y) {
    let fx = 0
    let fy = 0
    for (let charge_entry of Object.entries(charges)) { // [key,value]
        for (let pos of charge_entry[1]) {
            let dx = (pos[0] - x)
            let dy = (pos[1] - y)
            let distance_square = (dx ** 2 + dy ** 2)
            if (distance_square == 0) {
                continue
            }

            let direction = null
            if (charge_entry[0] == "positive") {
                direction = 1
            } else if (charge_entry[0] == "negative") {
                direction = -1
            }

            fx = (fx + ((1 / distance_square) * (dx / Math.sqrt(distance_square)) * direction))
            fy = (fy + ((1 / distance_square) * (dy / Math.sqrt(distance_square)) * direction))
        }
    }
    return [fx,fy]
}

function deg_gap(existing) {
    existing.sort((a, b) => a - b)
    let result = []

    if (existing.length === 0) {
        return [[0,360]]
    }

    for (let i = 0;(i < (existing.length - 1));i++) {
        result.push([existing[i],existing[i + 1]])
    }

    result.push([existing[existing.length - 1],(360 + existing[0])])

    return result
}
