import {ChargeVisualizer} from "./engine.js"

let mouse_pos = [0,0]
let resolution = [0,0]
let selected_tool = null

let ctx = null
let vis_ctx = null

// General
window.on_init = function() {
    ctx = element_id("viewport").getContext("2d")
    vis_ctx = new ChargeVisualizer(ctx)
    
    window.addEventListener("resize",update_resolution)
    update_resolution()

    element_id("selector-positive").addEventListener("click",function() {
        let did_set = click_charge_selector("positive")
        reset_selectors()
        if (did_set) {
            element_id("selector-positive").classList.add("selector-selected")
        }
    })
    element_id("selector-negative").addEventListener("click",function() {
        let did_set = click_charge_selector("negative")
        reset_selectors()
        if (did_set) {
            element_id("selector-negative").classList.add("selector-selected")
        }
    })

    element_id("viewport").addEventListener("click",function(event) {
        if (selected_tool == "positive") {
            vis_ctx.charges.positive.push([event.clientX,event.clientY])
        } else if (selected_tool == "negative") {
            vis_ctx.charges.negative.push([event.clientX,event.clientY])
        }
        vis_ctx.render(resolution,true,true,true)
    })
}

function update_resolution() {
    let client_rect = element_id("viewport").getBoundingClientRect()
    let new_resolution = [
        client_rect.width,
        client_rect.height
    ]
    resolution = new_resolution
    element_id("viewport").setAttribute("width",resolution[0])
    element_id("viewport").setAttribute("height",resolution[1])
    vis_ctx.render(resolution,true,true,true,true)
}

// Elements
function click_charge_selector(clicked_charge) {
    if (clicked_charge == selected_tool) {
        selected_tool = null
        return false
    } else {
        selected_tool = clicked_charge
        return true
    }
}

function reset_selectors() {
    element_id("selector-positive").classList.remove("selector-selected")
    element_id("selector-negative").classList.remove("selector-selected")
}

// Other
let element_cache = {}
function element_id(id,force_reload) {
    if (force_reload || !element_cache[id]) {
        element_cache[id] = document.getElementById(id)
    }
    return element_cache[id]
}