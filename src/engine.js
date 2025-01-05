export class ChargeVisualizer {
    constructor(ctx) {
        this.config = {
            "field_lines": {
                "color_line": [0,0,0],
                "color_indicator": [0,0,0],
                "start_positive": true,
                "deg_step": 10,
                "allow_deg_gap": false,
                "indicator_enabled": false,
                "indicator_distance": 250,
                "max_steps": 10000,
                "step_size": 5,
                "width": 1
            },
            "charges": {
                "color_positive": [255,0,0],
                "color_negative": [0,0,255],
                "symbol_radius": 10
            }
        }

        this._ctx = ctx
        this.charges = {
            "positive": [],
            "negative": []
        }
        this._render_mem = null
    }

    clear(resolution) {
        this._render_mem = {
            "charge_hits": {}
        }
        this._ctx.fillStyle = "#ffffff"
        this._ctx.fillRect(0,0,resolution[0],resolution[1])
    }

    render(resolution,draw_charges,draw_field_lines,draw_potential) {
        this.clear(resolution)
        if (draw_field_lines) {
            this._spread_from_charges(resolution)
        }
        if (draw_potential) {
            
        }
        if (draw_charges) {
            for (let charge_entry of Object.entries(this.charges)) {
                for (let pos of charge_entry[1]) {
                    if (charge_entry[0] == "positive") {
                        this._ctx.fillStyle = "rgb(%r,%g,%b)".replace("%r",this.config.charges.color_positive[0]).replace("%g",this.config.charges.color_positive[1]).replace("%b",this.config.charges.color_positive[2])
                    } else {
                        this._ctx.fillStyle = "rgb(%r,%g,%b)".replace("%r",this.config.charges.color_negative[0]).replace("%g",this.config.charges.color_negative[1]).replace("%b",this.config.charges.color_negative[2])
                    }
                    this._ctx.beginPath()
                    this._ctx.arc(pos[0],pos[1],this.config.charges.symbol_radius,0,(2 * Math.PI))
                    this._ctx.fill()
                }
            }
        }
    }

    _spread_from_charges(resolution) {
        let primary_array = null
        let secondary_array = null
        this._render_mem.charge_hits = {}
        if (this.config.field_lines.start_positive) {
            primary_array = this.charges.positive
            secondary_array = this.charges.negative
        } else {
            primary_array = this.charges.negative
            secondary_array = this.charges.positive
        }
        for (let pos of primary_array) {
            for (let angle = 0;(angle < 360);(angle = (angle + this.config.field_lines.deg_step))) {
                let rad_step = (angle * Math.PI / 180)
                this._draw_line_path(
                    (pos[0] + Math.cos(rad_step)),
                    (pos[1] + Math.sin(rad_step)),
                    (!this.config.field_lines.start_positive),
                    false,
                    resolution
                )
            }
        }
        if (!this.config.field_lines.allow_deg_gap) {
            for (let pos of secondary_array) {
                let hits = this._render_mem.charge_hits[pos.toString()]
                if (!hits) {
                    hits = []
                }
                let hit_gaps = deg_gap(hits)
                for (let gap of hit_gaps) {
                    if (gap[1] <= gap[0]) {
                        gap[1] = (gap[1] + 360)
                    }
                    let gap_size = (gap[1] - gap[0])
                    if (gap_size <= this.config.field_lines.deg_step) {
                        continue
                    }
                    let gap_points = Math.floor(gap_size / this.config.field_lines.deg_step)
                    for (let i = 0;(i < gap_points);i++) {
                        let point_rad = ((gap[0] + i * (gap_size / gap_points)) * Math.PI / 180)
                        if ((i === 0) && (point_rad !== 0)) {
                            continue
                        }
                        this._draw_line_path(
                            (pos[0] + Math.cos(point_rad)),
                            (pos[1] + Math.sin(point_rad)),
                            this.config.field_lines.start_positive,
                            true,
                            resolution
                        )
                    }
                }
            }
        }
    }

    _draw_line_path(x,y,reverse,freeze_arrays,resolution) {
        let x_pos = x
        let y_pos = y
        let steps_remaining = this.config.field_lines.max_steps
    
        this._ctx.beginPath()
        this._ctx.moveTo(x_pos,y_pos)
        let indicator_pos = []
        let prev_pos = null
        let indicator_distance_left = this.config.field_lines.indicator_distance
        while (steps_remaining > 0) {
            let [fx,fy] = this._calculate_field_vector(x_pos,y_pos)
            let normal = Math.sqrt(fx ** 2 + fy ** 2)
            if (normal == 0) {
                break
            }
            let dx = (this.config.field_lines.step_size * fx / normal)
            let dy = (this.config.field_lines.step_size * fy / normal)
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
                indicator_distance_left = this.config.field_lines.indicator_distance
                indicator_pos.push([
                    x_pos,
                    y_pos,
                    Math.atan2(-dy,-dx)
                ])
            }
            if ((x_pos < 0) || (x_pos >= resolution[0]) || (y_pos < 0) || (y_pos >= resolution[1])) {
                steps_remaining = 1
            }
            this._ctx.lineTo(x_pos,y_pos)
            steps_remaining = (steps_remaining - 1)
    
            let escape = false
            for (let charge_entry of Object.entries(this.charges)) {
                for (let pos of charge_entry[1]) {
                    let charge_dx = (x_pos - pos[0])
                    let charge_dy = (y_pos - pos[1])
                    if (Math.sqrt(charge_dx ** 2 + charge_dy ** 2) <= this.config.field_lines.step_size) {
                        if (!freeze_arrays) {
                            let entry_angle = (Math.atan2(-charge_dy,-charge_dx) / Math.PI * 180 + 180)
                            let pos_string = pos.toString()
                            if (this._render_mem.charge_hits[pos_string] === undefined) {
                                this._render_mem.charge_hits[pos_string] = []
                            }
                            this._render_mem.charge_hits[pos_string].push(entry_angle)
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
        this._ctx.lineWidth = this.config.field_lines.line_width
        this._ctx.strokeStyle = "rgb(%r,%g,%b)".replace("%r",this.config.field_lines.color_line[0]).replace("%g",this.config.field_lines.color_line[1]).replace("%b",this.config.field_lines.color_line[2])
        this._ctx.stroke()
    
        if (this.config.field_lines.indicator_enabled) {
            for (let arrow of indicator_pos) {
                draw_indicator(arrow[0],arrow[1],arrow[2])
            }
        }
    }

    _calculate_field_vector(x,y) {
        let fx = 0
        let fy = 0
        for (let charge_entry of Object.entries(this.charges)) {
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