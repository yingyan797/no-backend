// main function 
function process_form(num) {
    try {
        switch (num) {
            case 1: sunrise_set(num); break;
            case 2: sun_position(num); break;
            case 3: sun_time_limit(num); break
            case 4: sun_date_limit(num); break;
            case "a1": sphere_distance(); break;
            case "traj": traj_date(); break;
            case "shad": view_earth(); break;
        } 
    } catch(err) {
        alert("[Debug message] "+err);
    }
}

function deg_to_rad(deg) {
    return deg / 180 * Math.PI;
} function rad_to_deg(rad) {
    return 180 * rad / Math.PI
} function sin_to_cos(sin) {
    if (sin >= 1 || sin <= -1)
        return 0;
    return Math.sqrt(1-sin*sin)
} function dot(v1, v2) {
    return v1.map((x, i) => v1[i] * v2[i]).reduce((p1, p2) => p1 + p2);
} function vec_angle(v1, v2) {
    const cos = dot(v1,v2) / Math.sqrt(dot(v1, v1) * dot(v2, v2));
    if (cos >= 1) {
        return 0;
    } else if (cos <= -1) {
        return Math.PI
    }
    return Math.acos(cos);
} function vec_debase(v1, v2) {
    const l2 = Math.sqrt(dot(v2, v2))
    const dl = dot(v1, v2) / l2;
    return v2.map((x,i) => v1[i] - x/l2*dl);
}

function triangular(lat, dlon) {
    return [Math.cos(lat),Math.cos(dlon+Math.PI/2),Math.sin(lat),Math.sin(dlon+Math.PI/2)]
} function sun_vectors(lat, noon_shift) {
    let dlon = 0;
    if (noon_shift.length == 1) {
        dlon = noon_shift[0];
    } else {
        dlon = (noon_shift[1] - noon_shift[0])/86400*2*Math.PI
    }
    // alert(dlon);
    const vs = triangular(lat, dlon);
    return [[vs[0]*vs[1], vs[0]*vs[3], vs[2]], 
            [-vs[3], vs[1], 0],
            [-vs[2]*vs[1], -vs[2]*vs[3], vs[0]]]
} function sun_geom(sinlat0, lat, noon_shift) {
    const vecs = sun_vectors(lat, noon_shift);
    const sun = [0, sin_to_cos(sinlat0), sinlat0];
    const ht = Math.PI/2 - vec_angle(sun, vecs[0]);
    const ort = vec_debase(sun, vecs[0]);
    let drn = vec_angle(ort, vecs[2]);
    if (dot(ort, vecs[1]) < 0) {
        drn = 2*Math.PI - drn;
    }
    return [drn, ht]
} function sun_ht(sinlat0, lat, noon_shift) {
    const sun = [0, sin_to_cos(sinlat0), sinlat0];
    const loc = sun_vectors(lat, noon_shift)[0];
    return Math.PI/2 - vec_angle(sun, loc);
} function sun_drn(sinlat0, lat, noon_shift) {
    const vecs = sun_vectors(lat, noon_shift);
    const sun = [0, sin_to_cos(sinlat0), sinlat0];
    const ort = vec_debase(sun, vecs[0]);
    let drn = vec_angle(ort, vecs[2]);
    if (dot(ort, vecs[1]) < 0) {
        drn = 2*Math.PI - drn;
    }
    return drn;
}
function direction_class(ang) {
    const rg = 15;
    if (ang < rg || ang > 360-rg)
        return "North";
    if (ang >= rg && ang <= 90-rg)
        return "Northeast";
    if (ang > 90-rg && ang < 90+rg)
        return "East";
    if (ang >= 90+rg && ang <= 180-rg)
        return "Southeast";
    if (ang > 180-rg && ang < 180+rg)
        return "South";
    if (ang >= 180+rg && ang <= 270-rg)
        return "Southwest";
    if (ang > 270-rg && ang < 270+rg)
        return "West";
    if (ang >= 270+rg && ang <= 360-rg)
        return "Northwest";
}

function time_convert(seconds) {
    let secs = seconds;
    let d = 0;
    while (secs < 0) {
        secs += 86400;
        d = -1;
    }
    while (secs > 86400) {
        secs -= 86400;
        d += 1;
    }
    const h = parseInt(secs / 3600);
    const m = parseInt((secs - 3600*h) / 60);
    const s = secs - 3600*h - 60*m;
    return [h, m, s, d]
} function time_display(secs) {
    let tcv = time_convert(secs);
    for (i = 0; i < tcv.length-1; i++) {
        if (tcv[i] < 10) {
            tcv[i] = "0"+String(tcv[i]);
        }
    }
    let res = tcv[0]+":"+tcv[1]+":"+tcv[2];
    if (tcv[3] > 0) {
        res += " <"+tcv[3]+" day(s) after>";
    } else if (tcv[3] < 0) {
        res += " <"+(-tcv[3])+"day(s) before>";
    }
    return res;
} function date_display(m, d) {
    mnames = ["January", "February", "March", "April", "May", "June", "July", "August",
        "September", "October", "November", "December"
    ]
    return mnames[m]+" "+d;
}
function sun_direct_lat_sin(date) {
    const y = date.getFullYear();
    const sprg_eqnx_secs = (date - new Date(y, 2, 21))/1000
    const ydays = (y % 400 === 0 || (y % 100 !== 0 && y % 4 === 0)) ? 366 : 365
    const phase = 2 * Math.PI * sprg_eqnx_secs / (86400 * ydays);
    let res = Math.sin(phase) * Math.sin(deg_to_rad(23.5));
    if (res > 1) {
        res = 1;
    }
    return res;
} function day_length(pss, lat) {
    const sbs = Math.tan(lat) * pss / Math.sqrt(1-pss*pss);
    let day_time_balance = 90;
    if (sbs <= -1) {
        day_time_balance = -90;
    } else if (sbs < 1) {
        day_time_balance = rad_to_deg(Math.asin(sbs));
    }
    return 86400 * (day_time_balance * 2 + 180) / 360
} function noon_seconds(tz, lon) {
    return 43200 + 3600*(15 * tz - lon)/15
}

// Form processing main functions
function hide_show(sec_id) {
    if (document.getElementById(sec_id).style.display == "none") {
        document.getElementById(sec_id).style.display = "block";
    } else {
        document.getElementById(sec_id).style.display = "none";
    }
} function vis_switch() {
    hide_show("calculator");
    hide_show("visual3d");
    if (document.getElementById("mode").innerText === "3D Visualization page >>") {
        document.getElementById("mode").innerText = "<< Back to sun calculator";
        view_earth();
    } else {
        document.getElementById("mode").innerText = "3D Visualization page >>";
    }
} function input_ang(aname, num) {
    const field = "ang_"+num; 
    document.getElementById("calc_"+num).disabled = false;
    document.getElementById("ctrl_"+num).style.display = "none";
    switch (aname) {
        case "ht":
            document.getElementById(field).min = -90;
            document.getElementById(field).max = 90;
            document.getElementById("ht_lab_"+num).style.color = "blueviolet";
            document.getElementById("ht_lab_"+num).style.fontSize = "large";
            document.getElementById("drn_lab_"+num).style.color = "gray";
            document.getElementById("drn_lab_"+num).style.fontSize = "small";
            break;
        case "drn":
            document.getElementById(field).min = 0;
            document.getElementById(field).max = 360;
            document.getElementById("ht_lab_"+num).style.color = "gray";
            document.getElementById("ht_lab_"+num).style.fontSize = "small";
            document.getElementById("drn_lab_"+num).style.color = "blueviolet";
            document.getElementById("drn_lab_"+num).style.fontSize = "large";
            break;
    }
}

function sunrise_set(num) {
    const lon = document.getElementById("lon_"+num).value
    const lat = deg_to_rad(document.getElementById("lat_"+num).value);
    const tz = document.getElementById("tz_"+num).value;
    const date = new Date(document.getElementById("date_"+num).value)
    const pss = sun_direct_lat_sin(date);
    const dl = day_length(pss, lat);
    const hdl = dl/2;
    const noon = noon_seconds(tz, lon);
    const nsfts = [-hdl/86400*2*Math.PI, hdl/86400*2*Math.PI];
    const drn = nsfts.map((x,i) => Math.round(100*rad_to_deg(sun_geom(pss, lat, [x])[0]))/100);
    const dclass = drn.map((x,i) => direction_class(x));
    document.getElementById("res_"+num).style.display = "block";
    document.getElementById("_"+num+"_sr").innerHTML = time_display(Math.round(noon - hdl));
    document.getElementById("_"+num+"_rd").innerHTML = drn[0]+" <span style='font-size: small'>"+dclass[0]+"</span>"
    document.getElementById("_"+num+"_ss").innerHTML = time_display(Math.round(noon + hdl));
    document.getElementById("_"+num+"_sd").innerHTML = drn[1]+" <span style='font-size: small'>"+dclass[1]+"</span>"
    document.getElementById("_"+num+"_dl").innerHTML = time_display(Math.round(dl));
}

function sun_position(num) {
    const lon = document.getElementById("lon_"+num).value
    const lat = deg_to_rad(document.getElementById("lat_"+num).value);
    const tz = document.getElementById("tz_"+num).value;
    const date = document.getElementById("date_"+num).value;
    const iptime = document.getElementById("time_"+num).value;
    const time = parseInt(iptime.slice(0,2))*3600 + parseInt(iptime.slice(3,5))*60;
    const noon = noon_seconds(tz, lon);
    const sinlat0 = sun_direct_lat_sin(new Date(date));
    const res = sun_geom(sinlat0, lat, [noon, time])
    document.getElementById("res_"+num).style.display = "block";
    const ht = Math.round(100*rad_to_deg(res[1]))/100;
    const drn = Math.round(100*rad_to_deg(res[0]))/100;
    document.getElementById("_"+num+"_sh").innerText = ht + " degree";
    document.getElementById("_"+num+"_sd").innerText = drn +" - "+ direction_class(drn);
}

function _approach_time(sinlat0, lat, noon, calc, low, high, std) {
    let tl = low;
    let th = high;
    let t = tl;
    while (true) {
        const val = calc(sinlat0, lat, [noon, t])
        const diff = val - std;
        if (diff < 0) {
            tl = t;
            if (th - t <= 1) {
                if (Math.abs(diff) > Math.abs(calc(sinlat0, lat, [noon, th]) - std))
                    t = th;
                break;
            }
            t = (th + t)/2;
        } else {
            th = t;
            if (t - tl <= 1) {
                if (Math.abs(diff) > Math.abs(calc(sinlat0, lat, [noon, tl]) - std))
                    t = tl;
                break;
            }
            t = (t + tl)/2;
        }
    }
    return Math.round(t)
} function _approach_date(lat, year, noon_shift, calc, low, high, std) {
    const sprg_eqnx = (low - new Date(year, 2, 21))/86400000;
    const ydays = (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) ? 366 : 365;
    const sun_rate = 2 * Math.PI / ydays;
    const axis_sin = Math.sin(deg_to_rad(23.5));
    let phase = sprg_eqnx * sun_rate;
    let prev_diff = 100;
    let date_nums = [];
    for (i = 0; i < (high-low)/86400000+1; i++) {
        let sinlat0 = Math.sin(phase) * axis_sin;
        if (sinlat0 > 1) {
            sinlat0 = 1;
        } // The value is sun_direct_lat_sin
        const diff = calc(sinlat0, lat, noon_shift) - std;
        if (i > 0) {
            if (diff * prev_diff <= 0) { // sandwiched
                if (Math.abs(diff) <= Math.abs(prev_diff))
                    date_nums.push(i);
                else
                    date_nums.push(i-1);
            }
        }
        prev_diff = diff;
        phase += sun_rate;
    }
    return date_nums;
}

function sun_time_limit(num) {
    const lon = document.getElementById("lon_"+num).value
    const lat = deg_to_rad(document.getElementById("lat_"+num).value);
    const tz = document.getElementById("tz_"+num).value;
    const date0 = new Date(document.getElementById("date_"+num).value);
    const noon = noon_seconds(tz, lon);
    const sinlat0 = sun_direct_lat_sin(date0);
    let degree = document.getElementById("ang_"+num).value;
    const ang = deg_to_rad(degree);
    let res = [];
    let mode = "height";
    document.getElementById("res_"+num).style.display = "block";
    if (document.getElementById("ang_"+num).min == -90) {
        // input angle is sun height, symmetrical monotonic by noon
        const ht_range = [0,-Math.PI].map(ns => sun_ht(sinlat0, lat, [ns]));
        if (ht_range[0] < ang || ht_range[1] > ang) {
            res = "**Sun height NOT reachable -- Max height: "+rad_to_deg(ht_range[0])+"; Min height: "+rad_to_deg(ht_range[1])+" (degree) **";
        } else {
            const t1 = _approach_time(sinlat0, lat, noon, sun_ht, noon-43200, noon, ang);
            const t2 = 2*noon - t1;
            res = time_display(t1) + "; " +time_display(t2);
        }
        degree += " degree"
    } else {
        mode = "direction"; // Whole day monotonic
        const t = _approach_time(sinlat0, lat, noon, sun_drn, noon-43200, noon+43200, ang);
        res = time_display(t);
        degree = degree +" ("+ direction_class(degree)+")"
    }
    document.getElementById("res_"+num).innerHTML = "<textarea readonly>" +res+"</textarea><br> At these times of "+document.getElementById("date_"+num).value+", Sun "+mode+" is "+degree
}
function sun_date_limit(num) {
    const lon = document.getElementById("lon_"+num).value
    const lat = deg_to_rad(document.getElementById("lat_"+num).value);
    const year = document.getElementById("year_"+num).value;
    const tz = document.getElementById("tz_"+num).value;
    const iptime = document.getElementById("time_"+num).value;
    const time = parseInt(iptime.slice(0,2))*3600 + parseInt(iptime.slice(3,5))*60;
    const noon_shift = [(time - noon_seconds(tz, lon))/86400*2*Math.PI];
    const ang = document.getElementById("ang_"+num).value; 
    let dfrom = new Date(year, 0, 1);
    let dto = new Date(year, 11, 31);
    if (document.getElementById("opt_4").style.display != "none") {
        dfrom = new Date(document.getElementById("dfrom_"+num).value);
        dto = new Date(document.getElementById("dto_"+num).value);
    }
    let date_nums = [];
    let mode = "height";
    const std = deg_to_rad(ang);
    if (document.getElementById("ang_"+num).min == -90) {
        date_nums = _approach_date(lat, year, noon_shift, sun_ht, dfrom, dto, std);
    } else {
        mode = "direction";
        date_nums = _approach_date(lat, year, noon_shift, sun_drn, dfrom, dto, std);
    }
    let res = "<th> No solution </th>";
    if (date_nums.length > 0) {
        const base_value = dfrom.valueOf();
        res = date_nums.map(num => {
            const date = new Date(base_value + num * 86400000);
            return "<td>"+date_display(date.getMonth(), date.getDate())+"</td>";
        })
    }
    document.getElementById("res_"+num).style.display = "block";
    document.getElementById("res_"+num).innerHTML = "<table style='width:auto'><tr>"+res+"</tr></table> On these dates, Sun "+mode+" is "+ang+" degree at "+iptime;
}

function sphere_distance() {
    const lon1 = deg_to_rad(document.getElementById("lon_a1_1").value);
    const lon2 = deg_to_rad(document.getElementById("lon_a1_2").value);
    const lat1 = deg_to_rad(document.getElementById("lat_a1_1").value);
    const lat2 = deg_to_rad(document.getElementById("lat_a1_2").value);
    const rise2 = Math.pow(Math.sin(lat1)-Math.sin(lat2), 2);
    const ra = Math.cos(lat1);
    const rb = Math.cos(lat2);
    const run2 =ra*ra + rb*rb - 2*ra*rb*Math.cos(lon1 - lon2);
    const ang = 2*Math.asin(Math.sqrt(rise2+run2)/2);
    const d = document.getElementById("radius_a1").value*ang
    document.getElementById("res_a1").value = Math.round(100*d)/100 + " km";
}

function traj_date() {
    try {
    const lon = document.getElementById("lon_vis").value;
    const lat = deg_to_rad(document.getElementById("lat_vis").value);
    const tz = document.getElementById("tz_vis").value;
    const noon_rate = 2*Math.PI/288;
    let noon_shift = - noon_rate * 144;
    let time = Math.round(noon_seconds(tz, lon) - 43200);
    let sinlat0 = 0;
    if (document.getElementById("sdr_date").checked) {
        const date = document.getElementById("date_vis").value;
        sinlat0 = sun_direct_lat_sin(new Date(date));
    } else {
        sinlat0 = Math.sin(deg_to_rad(document.getElementById("sunlat_vis").value));
    }
    let c = 'black';
    const xs = [0];
    const ys = [0];
    const zs = [0];
    const cs = [c];
    const ts = [''];
    let prev_ht = -1;
    
    function link_origin() {
        xs.push(0);
        ys.push(0);
        zs.push(0);
        cs.push(c);
        ts.push('');
    }
    for (m = 0; m < 288; m++) {
        const pos = sun_geom(sinlat0, lat, [noon_shift]);
        const l = 100*Math.cos(pos[1]);
        xs.push(l*Math.cos(pos[0]));
        ys.push(-l*Math.sin(pos[0]));
        zs.push(100*Math.sin(pos[1]));
        cs.push(c);
        const drn = Math.round(100*rad_to_deg(pos[0]))/100;
        ts.push(time_display(time)+", "+direction_class(drn)+"("+drn+"), Height: "+Math.round(rad_to_deg(pos[1])*100)/100);
        // ts.push({"Time": time_display(time), "Direction":drn+" ("+direction_class(drn)+")", "Height":rad_to_deg(pos[1])});
        if (m == 144) {
            link_origin()
        } else if (pos[1] * prev_ht <= 0) {
            link_origin();
            if (c == 'black') {
                c = 'red';
            } else {
                c = 'black';
            }
        }
        // alert(m+"+"+time)
        noon_shift += noon_rate;
        time += 300;
        prev_ht = pos[1];
    }
    link_origin();    
    Plotly.newPlot('vis_traj', [{
        type: 'scatter3d',
        mode: 'lines',
        x: xs,
        y: ys,
        z: zs,
        text: ts,
        hoverinfo: 'text',
        opacity: 1,
        line: {
            width: 6,
            color: cs,
            reversescale: false
        }
        }], {
        height: 640
    });
    } catch (err) {
        alert(err)
    }
}

function shad_setdate(num) {
    document.getElementById("date_shad").stepUp(num);
    view_earth();
}

function view_earth() {
    const lon = document.getElementById("lon_shad").value;
    const lat = document.getElementById("lat_shad").value;
    const r = document.getElementById("radius_shad").value;
    const time = time_display(document.getElementById("time_shad").value)
    document.getElementById("info_shad").innerText = "Camera position (lon: " + lon + ", lat: "+ lat + ", alt: "+parseInt(6371*(r-1))+"km)\n\
        Time (GMT+0): "+time;
    
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec3 aVertexNormal;
        attribute vec4 aVertexColor;
    
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        uniform vec3 uLightDirection;
        uniform vec3 uAmbientColor;
        uniform vec3 uDiffuseColor;
        uniform vec3 uSpecularColor;
        uniform float uShininess;
    
        varying lowp vec4 vColor;
    
        void main(void) {
          gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
          vec3 normal = normalize(vec3(uNormalMatrix * vec4(aVertexNormal, 0.0)));
          
          vec3 lightDir = normalize(mat3(uModelViewMatrix) * uLightDirection);
          
          // float diffuseFactor = max(dot(normal, lightDir), 0.0);
          float diffuseFactor = dot(normal, lightDir);
    
          if (diffuseFactor < -0.1) {
            diffuseFactor = 0.0;
          } else if (diffuseFactor < 0.0) {
            diffuseFactor += 0.1;
          } else if (diffuseFactor < 0.4) {
            diffuseFactor += 0.6;
          } else {
            diffuseFactor = 1.0;
          }
          
          vec3 viewDir = normalize(-vec3(uModelViewMatrix * aVertexPosition));
          vec3 reflectDir = reflect(-lightDir, normal);
          float specularFactor = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
          if (aVertexColor.b < 1.5*aVertexColor.r || aVertexColor.b < 1.2*aVertexColor.g) {
            specularFactor /= 3.0;
          } else if (abs(1.0-aVertexColor.r/aVertexColor.g) < 0.9 && aVertexColor.r+aVertexColor.g > 4.0*aVertexColor.b) {
            specularFactor /= 2.0;
          } 
          
          vec3 ambient = uAmbientColor * vec3(aVertexColor);
          vec3 diffuse = uDiffuseColor * vec3(aVertexColor) * diffuseFactor;
          vec3 specular = uSpecularColor * specularFactor;
          
          vColor = vec4(ambient + diffuse + specular, aVertexColor.a);
        }
      `;
    
      // Fragment shader program
    
      const fsSource = `
        varying lowp vec4 vColor;
    
        void main(void) {
          gl_FragColor = vColor;
        }
      `;
    const camera = new Camera(0,0,0);
    const sinlat0 = sun_direct_lat_sin(new Date(document.getElementById("date_shad").value));
    const proj = sin_to_cos(sinlat0);
    const dlon = Math.PI * (1-2*document.getElementById("time_shad").value/86400);
    const light = new LightSource(proj*Math.cos(dlon),  proj*Math.sin(dlon), sinlat0);
    camera.moveTo(document.getElementById("lon_shad").value, document.getElementById("lat_shad").value, document.getElementById("radius_shad").value);
    render("#earth_shad", vsSource, fsSource, camera, light, {
        vertices: earth_vertices,
        colors: vert_colors,
        normals: earth_vertices, 
        indices: earth_indices
    });
}

  