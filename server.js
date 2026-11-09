const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Connectar a la base de dades PostgreSQL (Local o Núvol)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/crm_db',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Funció auxiliar per passar de YYYY-MM-DD a DD/MM/YYYY
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// 2. Crear taules a PostgreSQL
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE,
                password VARCHAR(100),
                role VARCHAR(50)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                name1 VARCHAR(255),
                phone1 VARCHAR(100),
                name2 VARCHAR(255),
                phone2 VARCHAR(100),
                email VARCHAR(255),
                category VARCHAR(100), 
                event_date VARCHAR(50), 
                service_details TEXT, 
                estimated_price NUMERIC DEFAULT 0, 
                deposit NUMERIC DEFAULT 0,
                deposit_date VARCHAR(50),
                status VARCHAR(50),
                notes TEXT,
                web_domain_hosting TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const resUser = await pool.query("SELECT * FROM users WHERE username = $1", ['JORDIttwCrm']);
        if (resUser.rows.length === 0) {
            await pool.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ['JORDIttwCrm', '@#Jordiadmin@#', 'JORDIttwCrm']);
            console.log('Usuari administrador creat per defecte (admin / 1234).');
        }
    } catch (err) {
        console.error('Error inicialitzant la base de dades:', err.message);
    }
};
initDb();

// 3. Login
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ca">
        <head>
            <meta charset="UTF-8">
            <title>CRM - Estudi Jordi & TTW</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #18181b; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #27272a; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); width: 340px; color: #f4f4f5; border: 1px solid #3f3f46; text-align: center; }
                h2 { margin-top: 0; font-weight: 600; color: #ffffff; }
                input { width: 100%; padding: 12px; margin: 12px 0; background: #18181b; border: 1px solid #3f3f46; color: white; border-radius: 6px; box-sizing: border-box; }
                input:focus { border-color: #ef4444; outline: none; }
                button { width: 100%; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: background 0.2s; }
                button:hover { background: #dc2626; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>CRM Accés</h2>
                <form action="/login" method="POST">
                    <input type="text" name="username" placeholder="Usuari" required autocomplete="off">
                    <input type="password" name="password" placeholder="Contrasenya" required>
                    <button type="submit">Entrar</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
        if (result.rows.length > 0) {
            res.redirect('/panel?user=' + encodeURIComponent(result.rows[0].username) + '&category=Fotografia');
        } else {
            res.send("<body style='background:#18181b;color:white;text-align:center;padding-top:50px;font-family:sans-serif;'><h2>Credencials incorrectes</h2><a href='/' style='color:#ef4444;'>Tornar</a></body>");
        }
    } catch (err) {
        res.status(500).send("Error de connexió");
    }
});

// 4. Panell Principal
app.get('/panel', async (req, res) => {
    const username = req.query.user || 'JORDIttwCrm';
    const currentCategory = req.query.category || 'Fotografia'; 

    const isPhoto = currentCategory === 'Fotografia';
    const isAll = currentCategory === 'all';
    
    const themeColor = isPhoto ? '#991b1b' : (isAll ? '#334155' : '#065f46');
    const themeBg = isPhoto ? '#fef2f2' : (isAll ? '#f8fafc' : '#f0fdf4');
    const themeBorder = isPhoto ? '#fecaca' : (isAll ? '#e2e8f0' : '#d1fae5');
    const themeLight = isPhoto ? '#fee2e2' : (isAll ? '#f1f5f9' : '#ecfdf5');

    const logoJordiUrl = "https://jordimor.com/wp-content/uploads/2019/07/jordi-mor-web.png"; 
    const logoTTWUrl = "https://tutensweb.com/wp-content/uploads/2018/09/logo.png.webp";

    let headerLogoHtml = '';
    let headerTitleHtml = '';

    if (isAll) {
        headerLogoHtml = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${logoJordiUrl}" alt="Estudi Jordi" style="height: 38px; object-fit: contain;">
                <span style="color: #cbd5e1; font-weight: 300; font-size: 1.2rem;">|</span>
                <img src="${logoTTWUrl}" alt="TTW" style="height: 38px; object-fit: contain;">
            </div>
        `;
        headerTitleHtml = 'Estudi Jordi & TTW — Gestió Global de Clients';
    } else if (isPhoto) {
        headerLogoHtml = `<img src="${logoJordiUrl}" alt="Estudi Jordi" style="height: 42px; object-fit: contain;">`;
        headerTitleHtml = 'Estudi Jordi — Fotografia';
    } else {
        headerLogoHtml = `<img src="${logoTTWUrl}" alt="TTW" style="height: 42px; object-fit: contain;">`;
        headerTitleHtml = 'TTW — Disseny Web';
    }

    try {
        const allClientsRes = await pool.query("SELECT * FROM clients");
        const safeClientsJson = JSON.stringify(allClientsRes.rows).replace(/</g, '\\u003c');

        let query = "SELECT * FROM clients";
        let params = [];
        if (currentCategory !== 'all') {
            query += " WHERE category = $1";
            params.push(currentCategory);
        }
        query += " ORDER BY created_at DESC";

        const clientsRes = await pool.query(query, params);
        const clientsList = clientsRes.rows || [];

        let clientsRows = clientsList.map(c => {
            const isClientPhoto = c.category === 'Fotografia';
            const badgeClass = isClientPhoto ? 'badge-photo' : 'badge-web';
            const rowBorderClass = isClientPhoto ? 'row-photo' : 'row-web';
            
            const totalPrice = parseFloat(c.estimated_price) || 0;
            const deposit = parseFloat(c.deposit) || 0;
            const pending = totalPrice - deposit;
            const formattedEventDate = formatDate(c.event_date);
            const formattedDepositDate = formatDate(c.deposit_date);

            let primaryTitle = '';
            let contactInfo = '';

            if (isClientPhoto) {
                primaryTitle = (c.name1 && c.name2) ? `${c.name1} & ${c.name2}` : (c.name1 || c.name2 || 'Sense nom');
                const phonesStr = [c.phone1, c.phone2].filter(Boolean).join(' / ');
                contactInfo = `${c.email}<br><small style="color:#64748b;">📱 ${phonesStr || '-'}</small>`;
            } else {
                primaryTitle = c.name1 || 'Sense nom';
                contactInfo = `${c.email}<br><small style="color:#64748b;">📱 ${c.phone1 || '-'}</small>`;
            }

            const detailsHtml = (c.service_details || '').split(' | ').map(item => `• ${item}`).join('<br>');
            const notesHtml = (c.notes || '').split(' | ').map(item => `• ${item}`).join('<br>');

            let webExtraInfo = '';
            if (!isClientPhoto && c.web_domain_hosting) {
                webExtraInfo = `<br><small style="color:#065f46; font-weight:600;">🌐 Estat: ${c.web_domain_hosting}</small>`;
            }

            return `
                <tr class="${rowBorderClass}">
                    <td><strong>${primaryTitle}</strong>${isClientPhoto && c.event_date ? '<br><small style="color:#64748b;">📅 ' + formattedEventDate + '</small>' : ''}</td>
                    <td>${contactInfo}</td>
                    <td>
                        <span class="${badgeClass}">${c.category}</span><br>
                        <div style="font-size: 0.85rem; color:#334155; margin-top: 4px; line-height: 1.4;">${detailsHtml}</div>
                        ${webExtraInfo}
                        ${c.notes ? `<div style="font-size: 0.8rem; color:#64748b; margin-top: 4px; line-height: 1.3; border-top: 1px dashed #cbd5e1; padding-top: 3px;">${notesHtml}</div>` : ''}
                    </td>
                    <td>
                        <strong style="color:${isClientPhoto ? '#991b1b' : '#065f46'};">${totalPrice.toLocaleString('ca-ES', {style: 'currency', currency: 'EUR'})}</strong>
                        <br><small style="color:#64748b;">Senyal: ${deposit.toLocaleString('ca-ES', {style: 'currency', currency: 'EUR'})} ${c.deposit_date ? '('+formattedDepositDate+')' : ''}</small>
                        <br><small style="color:#dc2626; font-weight:600;">Pendent: ${pending.toLocaleString('ca-ES', {style: 'currency', currency: 'EUR'})}</small>
                    </td>
                    <td><span class="badge ${c.status}">${c.status}</span></td>
                    <td style="text-align: right; white-space: nowrap;">
                        <a href="/edit-client/${c.id}?user=${encodeURIComponent(username)}" class="btn-action btn-edit" title="Editar">✏️</a>
                        ${isClientPhoto ? `<a href="/download-ics/${c.id}" class="btn-action btn-ics" title="Afegir al Calendari iPhone (.ics)">📅</a>` : ''}
                        <a href="/view-pdf/${c.id}" target="_blank" class="btn-action btn-pdf" title="Veure PDF Pressupost">📄</a>
                        <form action="/delete-client" method="POST" style="display:inline; margin: 0;">
                            <input type="hidden" name="id" value="${c.id}">
                            <input type="hidden" name="user" value="${username}">
                            <input type="hidden" name="category" value="${currentCategory}">
                            <button type="submit" class="btn-action btn-delete" onclick="return confirm('Segur que vols eliminar aquest client?')" title="Eliminar">✕</button>
                        </form>
                    </td>
                </tr>
            `;
        }).join('');

        let formContent = '';
        if (isPhoto) {
            formContent = `
                <h3>Nou Projecte de Fotografia</h3>
                <form id="main-client-form" action="/add-client" method="POST" onsubmit="prepareFormAndSubmit(event)">
                    <input type="hidden" name="user" value="${username}">
                    <input type="hidden" name="category" value="Fotografia">
                    <input type="hidden" name="service_details" id="service-details-hidden">
                    <input type="hidden" name="notes" id="notes-hidden">

                    <label>Dades del Client / Parella</label>
                    <div class="couple-grid">
                        <div class="couple-col">
                            <label>Nom 1</label>
                            <input type="text" id="input-name1" name="name1" required placeholder="Ex: Marta" oninput="updateTimelineLabels()" autocomplete="off">
                            <label style="margin-top:8px;">Telèfon 1</label>
                            <input type="text" name="phone1" placeholder="600000000" autocomplete="off">
                        </div>
                        <div class="couple-col">
                            <label>Nom 2 (Opcional per bodes)</label>
                            <input type="text" id="input-name2" name="name2" placeholder="Ex: Marc" oninput="updateTimelineLabels()" autocomplete="off">
                            <label style="margin-top:8px;">Telèfon 2</label>
                            <input type="text" name="phone2" placeholder="600000000" autocomplete="off">
                        </div>
                    </div>

                    <label>Data de l'Esdeveniment</label>
                    <input type="date" name="event_date" id="event-date-input" required onchange="checkDateAvailability()">
                    <div id="date-busy-alert" class="date-alert"></div>

                    <label>Correu Electrònic de Contacte</label>
                    <input type="email" name="email" required placeholder="correu@client.com" style="margin-bottom: 8px;" autocomplete="off">

                    <label>Tarifa Base - Fotografia</label>
                    <select id="photo-pack-select" onchange="onPackChange()">
                        <option value="1500" data-price="1500" data-name="Reportatge de Noces" data-desc="<ul><li>Pre-boda</li><li>Un sol fotògraf dia de la boda</li><li>Àlbum 30x40 + caixa</li><li>Entrega dels originals</li><li><em>Ens quedem fins passats 3-4 cançons del ball nupcial</em></li></ul>">Reportatge de Noces — 1.500 €</option>
                        <option value="1600" data-price="1600" data-name="Reportatge de noces + 2 àlbums pares" data-desc="<ul><li>Pre-boda</li><li>Un sol fotògraf dia de la boda</li><li>Àlbum 30x40 + caixa</li><li>Entrega dels originals</li><li><strong>2 àlbums 20x25 pels pares</strong></li><li><em>Ens quedem fins passats 3-4 cançons del ball nupcial</em></li></ul>">Reportatge de noces + 2 àlbums pares — 1.600 €</option>
                        <option value="650" data-price="650" data-name="Reportatge de noces (solament originals)" data-desc="<ul><li>Fotògraf dia de la boda</li><li>Entrega dels originals</li><li><em>Ens quedem fins passats 3-4 cançons del ball nupcial</em></li></ul>">Reportatge de noces (solament originals) — 650 €</option>
                        <option value="160" data-price="160" data-name="Book" data-desc="<ul><li>Un sol fotògraf</li><li>Entrega dels originals</li></ul>">Book — 160 €</option>
                        <option value="150" data-price="150" data-name="Pre-Comunió" data-desc="<ul><li>Un sol fotògraf</li><li>Entrega dels originals</li><li><em>No anem al restaurant</em></li></ul>">Pre-Comunió — 150 €</option>
                        <option value="150" data-price="150" data-name="Embaràs" data-desc="<ul><li>Un sol fotògraf</li><li>Entrega dels originals</li></ul>">Embaràs — 150 €</option>
                        <option value="170" data-price="170" data-name="Bateig" data-desc="<ul><li>Un sol fotògraf</li><li>Entrega dels originals</li><li><em>No anem al restaurant</em></li></ul>">Bateig — 170 €</option>
                    </select>

                    <div id="pack-description" class="pack-desc-box"></div>

                    <div id="wedding-options-box" class="photo-options" style="display:none;">
                        <label style="margin-top:0; margin-bottom:10px;">Extres Bodes</label>
                        <div class="checkbox-group">
                            <input type="checkbox" id="opt-video" onchange="calculateTotal()">
                            <label for="opt-video" style="margin:0; text-transform:none; font-weight:normal; cursor:pointer;">Vídeo Boda (+1.100 €)</label>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="opt-sde" onchange="calculateTotal()">
                            <label for="opt-sde" style="margin:0; text-transform:none; font-weight:normal; cursor:pointer;">Same Day Edit (+500 €)</label>
                        </div>
                    </div>

                    <div class="photo-options" style="margin-top: 15px;">
                        <label style="margin-top:0; margin-bottom:10px;">Àlbums i Extres Opcionals</label>
                        
                        <div class="checkbox-group">
                            <input type="checkbox" id="album-rigid" onchange="calculateTotal()">
                            <label for="album-rigid" id="label-album-rigid" style="margin:0; text-transform:none; font-weight:normal; cursor:pointer;">Àlbum rígid 20x30</label>
                        </div>

                        <div class="checkbox-group">
                            <input type="checkbox" id="album-25x30" onchange="calculateTotal()">
                            <label for="album-25x30" style="margin:0; text-transform:none; font-weight:normal; cursor:pointer;">Àlbum 25x30 polipell (+275 €)</label>
                        </div>

                        <div class="checkbox-group">
                            <input type="checkbox" id="album-30x30" onchange="calculateTotal()">
                            <label for="album-30x30" style="margin:0; text-transform:none; font-weight:normal; cursor:pointer;">Àlbum 30x30 polipell (+350 €)</label>
                        </div>

                        <div class="checkbox-group">
                            <input type="checkbox" id="album-30x40" onchange="calculateTotal()">
                            <label for="album-30x40" style="margin:0; text-transform:none; font-weight:normal; cursor:pointer;">Àlbum 30x40 polipell (+390 €)</label>
                        </div>

                        <label style="margin-top:12px;">Quilometratge</label>
                        <label id="km-info-label" style="font-weight:normal; text-transform:none; font-size:0.85rem; margin-bottom:5px;">Primers 200km gratis, després 0,50€/km</label>
                        <input type="number" id="input-km" min="0" placeholder="Ex: 250 km" oninput="calculateTotal()" style="margin-bottom:5px;" autocomplete="off">
                    </div>

                    <div class="photo-options" style="margin-top: 15px;">
                        <label style="margin-top:0; margin-bottom:10px; color:${themeColor};">Planificació d'Horaris i Llocs</label>
                        
                        <div id="wedding-timeline-container">
                            <div class="timeline-grid">
                                <label id="label-house1">Casa 1</label>
                                <div style="display: flex; gap: 6px;">
                                    <input type="time" id="time-house1" style="width: 100px;">
                                    <input type="text" id="place-house1" placeholder="Lloc / Adreça" autocomplete="off">
                                </div>
                            </div>

                            <div class="timeline-grid">
                                <label id="label-house2">Casa 2</label>
                                <div style="display: flex; gap: 6px;">
                                    <input type="time" id="time-house2" style="width: 100px;">
                                    <input type="text" id="place-house2" placeholder="Lloc / Adreça" autocomplete="off">
                                </div>
                            </div>

                            <div class="timeline-grid">
                                <label>Cerimònia</label>
                                <div style="display: flex; gap: 6px;">
                                    <input type="time" id="time-ceremony" style="width: 100px;">
                                    <input type="text" id="place-ceremony" placeholder="Església / Lloc" autocomplete="off">
                                </div>
                            </div>

                            <div class="timeline-grid">
                                <label>Restaurant</label>
                                <div style="display: flex; gap: 6px;">
                                    <input type="time" id="time-restaurant" style="width: 100px;">
                                    <input type="text" id="place-restaurant" placeholder="Nom del restaurant" autocomplete="off">
                                </div>
                            </div>
                        </div>

                        <div id="simple-timeline-container" style="display:none;">
                            <div class="timeline-grid">
                                <label>Lloc i Hora</label>
                                <div style="display: flex; gap: 6px;">
                                    <input type="time" id="photo-time" style="width: 100px;">
                                    <input type="text" id="photo-place" placeholder="Lloc / Adreça" autocomplete="off">
                                </div>
                            </div>
                        </div>

                        <label style="margin-top: 10px;">Altres Observacions</label>
                        <textarea id="extra-notes" rows="2" placeholder="Detalls addicionals..."></textarea>
                    </div>

                    <div class="price-box">
                        <span>Total Pressupostat</span>
                        <input type="number" name="estimated_price" id="price-input" step="0.01" readonly required>
                    </div>

                    <label>Diners a Compte / Senyal (€)</label>
                    <input type="number" name="deposit" min="0" step="0.01" placeholder="Ex: 100" autocomplete="off" style="border-color: #10b981;">

                    <label>Data de l'Entrega de la Senyal</label>
                    <input type="date" name="deposit_date">

                    <label>Estat</label>
                    <select name="status">
                        <option value="Pendent">Pendent</option>
                        <option value="Contractat">Contractat</option>
                        <option value="Finalitzat">Finalitzat</option>
                    </select>

                    <button type="submit" class="btn-save">Guardar Projecte</button>
                </form>
            `;
        } else if (currentCategory === 'Web') {
            formContent = `
                <h3>Nou Projecte de Disseny Web</h3>
                <form id="main-client-form" action="/add-client" method="POST" onsubmit="prepareWebFormAndSubmit(event)">
                    <input type="hidden" name="user" value="${username}">
                    <input type="hidden" name="category" value="Web">
                    <input type="hidden" name="service_details" id="web-service-details-hidden">

                    <label>Nom del Client</label>
                    <input type="text" name="name1" required placeholder="Nom i cognoms o empresa" autocomplete="off">

                    <label>Telèfon de Contacte</label>
                    <input type="text" name="phone1" placeholder="600000000" autocomplete="off">

                    <label>Correu Electrònic</label>
                    <input type="email" name="email" required placeholder="correu@client.com" autocomplete="off">

                    <label>Estat de Domini i Hosting</label>
                    <select name="web_domain_hosting" required>
                        <option value="Té domini i hosting">Té domini i hosting</option>
                        <option value="Només hosting">Només hosting</option>
                        <option value="Només domini">Només domini</option>
                        <option value="No té ni domini ni hosting">No té ni domini ni hosting</option>
                    </select>

                    <label>Tipus de Projecte Web</label>
                    <select id="web-pack-select" name="web_pack" onchange="calculateWebTotal()">
                        <option value="340" data-price="340" data-name="Landing Page">Landing Page (des de 340€)</option>
                        <option value="495" data-price="495" data-name="Web Bàsic">Web Bàsic (des de 495€)</option>
                        <option value="645" data-price="645" data-name="Web Advanced">Web Advanced (des de 645€)</option>
                        <option value="800" data-price="800" data-name="E-commerce">E-commerce (des de 800€)</option>
                    </select>

                    <div id="web-extres-container" class="photo-options" style="margin-top: 15px;">
                        <label style="margin-top:0; margin-bottom:10px; color:${themeColor};">Opcions Addicionals</label>

                        <div class="checkbox-group" style="margin-bottom: 12px;">
                            <input type="checkbox" id="web-opt-seo" onchange="calculateWebTotal()">
                            <label for="web-opt-seo" style="margin:0; text-transform:none; font-weight:normal; cursor:pointer;">SEO Bàsic (+100 €)</label>
                        </div>

                        <div id="ecommerce-upload-box" style="margin-bottom: 15px; display: none; background: white; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <label style="margin-top:0; font-size:0.75rem;">Qui puja els productes?</label>
                            <select id="ecommerce-upload-type" onchange="calculateWebTotal()">
                                <option value="Client">Ho puja el Client</option>
                                <option value="TTW">Ho puja TTW</option>
                            </select>
                        </div>

                        <div id="languages-section" style="border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                            <label style="margin-top:0; margin-bottom:3px;">Idiomes Addicionals</label>
                            <small style="color:#64748b; display:block; margin-bottom:8px;">1r idioma: +50% del total acumulat. Segon i posteriors: la meitat del 1r.</small>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <input type="text" class="lang-input" placeholder="Idioma 1 (ex: Castellà)" oninput="calculateWebTotal()">
                                <input type="text" class="lang-input" placeholder="Idioma 2 (ex: Anglès)" oninput="calculateWebTotal()">
                                <input type="text" class="lang-input" placeholder="Idioma 3 (ex: Francès)" oninput="calculateWebTotal()">
                                <input type="text" class="lang-input" placeholder="Idioma 4" oninput="calculateWebTotal()">
                                <input type="text" class="lang-input" placeholder="Idioma 5" oninput="calculateWebTotal()">
                                <input type="text" class="lang-input" placeholder="Idioma 6" oninput="calculateWebTotal()">
                            </div>
                        </div>
                    </div>

                    <div class="price-box">
                        <span>Total Pressupostat</span>
                        <input type="number" name="estimated_price" id="web-price-input" step="0.01" readonly required>
                    </div>

                    <label>Diners a Compte / Senyal (€)</label>
                    <input type="number" name="deposit" min="0" step="0.01" placeholder="Ex: 150" autocomplete="off" style="border-color: #10b981;">

                    <label>Data de l'Entrega de la Senyal</label>
                    <input type="date" name="deposit_date">

                    <label>Estat</label>
                    <select name="status">
                        <option value="Pendent">Pendent</option>
                        <option value="Contractat">Contractat</option>
                        <option value="Finalitzat">Finalitzat</option>
                    </select>

                    <label>Observacions / Detalls</label>
                    <textarea name="notes" rows="2" placeholder="Altres detalls..."></textarea>

                    <button type="submit" class="btn-save">Guardar Projecte Web</button>
                </form>
            `;
        } else {
            formContent = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <h3>Vista Global de Tots els Clients</h3>
                    <p>Selecciona una pestanya superior (Fotografia o Disseny Web) si vols crear un nou projecte o emplenar formularis específics.</p>
                </div>
            `;
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="ca">
            <head>
                <meta charset="UTF-8">
                <title>CRM - Estudi Jordi & TTW</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background: ${themeBg}; margin: 0; padding: 30px; color: #1e293b; transition: background 0.3s; }
                    .container { max-width: 1450px; margin: 0 auto; }
                    
                    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 20px 30px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid ${themeBorder}; }
                    h1 { margin: 0; font-size: 1.4rem; color: ${themeColor}; }
                    .user-info { color: #64748b; font-size: 0.95rem; }
                    .user-info a { color: #dc2626; text-decoration: none; margin-left: 10px; font-weight: 500; }

                    .tabs { display: flex; gap: 12px; margin-bottom: 25px; }
                    .tab { padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.95rem; background: white; color: #64748b; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; transition: all 0.2s; }
                    .tab.active-photo { background: #991b1b; color: white; border-color: #991b1b; box-shadow: 0 4px 12px rgba(153,27,27,0.2); }
                    .tab.active-web { background: #065f46; color: white; border-color: #065f46; box-shadow: 0 4px 12px rgba(6,95,70,0.2); }

                    .grid { display: grid; grid-template-columns: ${isAll ? '1fr' : '520px 1fr'}; gap: 25px; }
                    .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid ${themeBorder}; }
                    .card h3 { margin-top: 0; margin-bottom: 20px; font-size: 1.15rem; color: ${themeColor}; border-bottom: 2px solid ${themeLight}; padding-bottom: 10px; }

                    label { display: block; font-weight: 600; font-size: 0.82rem; color: ${themeColor}; margin-bottom: 4px; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
                    input[type="text"], input[type="email"], input[type="number"], input[type="time"], input[type="date"], select, textarea { width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; background: #f9fafb; transition: border-color 0.2s; }
                    input:focus, select:focus, textarea:focus { border-color: ${themeColor}; background: white; outline: none; }

                    .couple-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 4px; }
                    .couple-col label { margin-top: 0; font-size: 0.75rem; color: #475569; }

                    .date-alert { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 10px 12px; border-radius: 8px; font-size: 0.85rem; margin-top: 6px; display: none; font-weight: 500; }

                    .pack-desc-box { background: ${themeLight}; border-left: 4px solid ${themeColor}; padding: 12px 15px; border-radius: 0 8px 8px 0; margin-top: 10px; margin-bottom: 15px; font-size: 0.9rem; color: ${themeColor}; line-height: 1.5; }
                    .pack-desc-box ul { margin: 5px 0 0 18px; padding: 0; }
                    .pack-desc-box li { margin-bottom: 3px; }

                    .photo-options { background: ${themeBg}; border: 1px solid ${themeBorder}; border-radius: 8px; padding: 15px; margin-top: 15px; }
                    .checkbox-group { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 0.95rem; cursor: pointer; }
                    .checkbox-group input { width: 18px; height: 18px; accent-color: ${themeColor}; cursor: pointer; margin: 0; }

                    .timeline-grid { display: grid; grid-template-columns: 130px 1fr; gap: 8px; align-items: center; margin-bottom: 8px; background: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .timeline-grid label { margin: 0; font-size: 0.75rem; color: #334155; }

                    .price-box { background: ${themeLight}; border: 1px solid ${themeBorder}; border-radius: 8px; padding: 15px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
                    .price-box span { font-size: 0.9rem; color: ${themeColor}; font-weight: 600; text-transform: uppercase; }
                    .price-box input { border: none; background: transparent; font-size: 1.5rem; font-weight: 700; color: ${themeColor}; width: 140px; text-align: right; padding: 0; }

                    button.btn-save { background: ${themeColor}; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; width: 100%; margin-top: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: background 0.2s; }
                    button.btn-save:hover { opacity: 0.9; }

                    table { width: 100%; border-collapse: collapse; }
                    th, td { text-align: left; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; vertical-align: top; }
                    th { background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
                    
                    tr.row-photo { border-left: 4px solid #ef4444; }
                    tr.row-web { border-left: 4px solid #10b981; }

                    .badge { padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; color: white; background: #94a3b8; }
                    .badge.Pendent { background: #f59e0b; }
                    .badge.Contractat { background: #10b981; }
                    .badge.Finalitzat { background: #06b6d4; }
                    
                    .badge-photo { padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; color: white; background: #ef4444; }
                    .badge-web { padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; color: white; background: #10b981; }

                    .btn-action { text-decoration: none; padding: 5px 8px; border-radius: 6px; font-size: 0.85rem; display: inline-block; text-align: center; margin-right: 2px; }
                    .btn-edit { background: #fef08a; }
                    .btn-ics { background: #e0f2fe; }
                    .btn-pdf { background: #f3e8ff; }
                    .btn-delete { background: #fee2e2; color: #ef4444; border: none; cursor: pointer; font-weight: bold; }
                </style>
                <script>
                    const registeredClients = JSON.parse('${safeClientsJson}');

                    function updateTimelineLabels() {
                        const name1 = document.getElementById('input-name1').value.trim();
                        const name2 = document.getElementById('input-name2').value.trim();

                        const l1 = document.getElementById('label-house1');
                        const l2 = document.getElementById('label-house2');
                        if (l1) l1.innerText = name1 ? 'Casa ' + name1 : 'Casa 1';
                        if (l2) l2.innerText = name2 ? 'Casa ' + name2 : 'Casa 2';
                    }

                    function checkDateAvailability() {
                        const dateInput = document.getElementById('event-date-input');
                        if (!dateInput) return;
                        const val = dateInput.value;
                        const alertBox = document.getElementById('date-busy-alert');

                        if (!val) {
                            alertBox.style.display = 'none';
                            return;
                        }

                        const conflict = registeredClients.find(c => c.event_date === val);
                        if (conflict) {
                            const couple = (conflict.name1 && conflict.name2) ? (conflict.name1 + ' & ' + conflict.name2) : (conflict.name1 || conflict.name2);
                            alertBox.innerHTML = '⚠️ <strong>Atenció:</strong> Ja tens registrat a <strong>' + couple + '</strong> per al ' + val.split('-').reverse().join('/') + '.';
                            alertBox.style.display = 'block';
                        } else {
                            alertBox.style.display = 'none';
                        }
                    }

                    function onPackChange() {
                        const packSelect = document.getElementById('photo-pack-select');
                        if (!packSelect) return;
                        const selectedOpt = packSelect.options[packSelect.selectedIndex];
                        const packName = selectedOpt.dataset.name;

                        const isWedding = packName.includes('Reportatge de noces');
                        document.getElementById('wedding-options-box').style.display = isWedding ? 'block' : 'none';
                        document.getElementById('wedding-timeline-container').style.display = isWedding ? 'block' : 'none';
                        document.getElementById('simple-timeline-container').style.display = isWedding ? 'none' : 'block';

                        const kmLabel = document.getElementById('km-info-label');
                        if (kmLabel) {
                            if (isWedding) {
                                kmLabel.innerText = 'Primers 200km gratis, després 0,50€/km';
                            } else {
                                kmLabel.innerText = 'Primers 100km gratis, després 0,50€/km';
                            }
                        }

                        calculateTotal();
                    }

                    function calculateTotal() {
                        const packSelect = document.getElementById('photo-pack-select');
                        if (!packSelect) return;

                        const selectedOpt = packSelect.options[packSelect.selectedIndex];
                        let basePrice = parseFloat(selectedOpt.dataset.price) || 0;
                        let descHtml = selectedOpt.dataset.desc;
                        const packName = selectedOpt.dataset.name;

                        document.getElementById('pack-description').innerHTML = descHtml;

                        const optVideo = document.getElementById('opt-video');
                        const optSde = document.getElementById('opt-sde');
                        if (optVideo && optVideo.checked) basePrice += 1100;
                        if (optSde && optSde.checked) basePrice += 500;

                        const rigidLabel = document.getElementById('label-album-rigid');
                        let rigidPrice = 195;
                        if (packName === 'Pre-Comunió') {
                            rigidPrice = 245;
                            if (rigidLabel) rigidLabel.innerText = 'Àlbum rígid 20x30 (+245 €)';
                        } else {
                            if (rigidLabel) rigidLabel.innerText = 'Àlbum rígid 20x30 (+195 €)';
                        }

                        if (document.getElementById('album-rigid').checked) basePrice += rigidPrice;
                        if (document.getElementById('album-25x30').checked) basePrice += 275;
                        if (document.getElementById('album-30x30').checked) basePrice += 350;
                        if (document.getElementById('album-30x40').checked) basePrice += 390;

                        const isWedding = packName.includes('Reportatge de noces');
                        const freeKmLimit = isWedding ? 200 : 100;

                        const km = parseFloat(document.getElementById('input-km').value) || 0;
                        if (km > freeKmLimit) {
                            basePrice += (km - freeKmLimit) * 0.50;
                        }

                        document.getElementById('price-input').value = basePrice.toFixed(2);
                    }

                    function calculateWebTotal() {
                        const packSelect = document.getElementById('web-pack-select');
                        if (!packSelect) return;

                        const selectedOpt = packSelect.options[packSelect.selectedIndex];
                        const basePrice = parseFloat(selectedOpt.dataset.price) || 0;
                        const packName = selectedOpt.dataset.name;

                        let subtotal = basePrice;
                        let details = [packName + ' (' + basePrice + '€)'];

                        const langSection = document.getElementById('languages-section');
                        const seoSection = document.getElementById('web-opt-seo').closest('.checkbox-group');
                        const ecomUploadBox = document.getElementById('ecommerce-upload-box');

                        if (packName === 'Landing Page') {
                            if (langSection) langSection.style.display = 'none';
                            if (seoSection) seoSection.style.display = 'none';
                            if (ecomUploadBox) ecomUploadBox.style.display = 'none';
                        } else {
                            if (langSection) langSection.style.display = 'block';
                            if (seoSection) seoSection.style.display = 'flex';

                            if (packName === 'E-commerce') {
                                if (ecomUploadBox) ecomUploadBox.style.display = 'block';
                                const uploadVal = document.getElementById('ecommerce-upload-type').value;
                                details.push('Gestió productes: ' + uploadVal);
                            } else {
                                if (ecomUploadBox) ecomUploadBox.style.display = 'none';
                            }

                            const seoCheckbox = document.getElementById('web-opt-seo');
                            if (seoCheckbox && seoCheckbox.checked) {
                                subtotal += 100;
                                details.push('SEO Bàsic (+100€)');
                            }

                            const langInputs = document.querySelectorAll('.lang-input');
                            const filledLangs = [];
                            langInputs.forEach(input => {
                                if (input.value.trim() !== '') {
                                    filledLangs.push(input.value.trim());
                                }
                            });

                            const firstLangCost = subtotal * 0.50;
                            const extraLangCost = firstLangCost * 0.50;

                            filledLangs.forEach((langName, idx) => {
                                const cost = (idx === 0) ? firstLangCost : extraLangCost;
                                subtotal += cost;
                                details.push('Idioma addicional (' + langName + ') [+' + cost.toFixed(2) + '€]');
                            });
                        }

                        document.getElementById('web-price-input').value = subtotal.toFixed(2);
                        document.getElementById('web-service-details-hidden').value = details.join(' | ');
                    }

                    function prepareFormAndSubmit(event) {
                        event.preventDefault();

                        const packSelect = document.getElementById('photo-pack-select');
                        const selectedOpt = packSelect.options[packSelect.selectedIndex];
                        const packName = selectedOpt.dataset.name;
                        let detailsArray = [packName];

                        const isWedding = packName.includes('Reportatge de noces');

                        if (isWedding) {
                            if (document.getElementById('opt-video').checked) detailsArray.push('Vídeo Boda (+1.100€)');
                            if (document.getElementById('opt-sde').checked) detailsArray.push('Same Day Edit (+500€)');
                        }

                        if (document.getElementById('album-rigid').checked) {
                            const rCost = (packName === 'Pre-Comunió') ? 245 : 195;
                            detailsArray.push('Àlbum rígid 20x30 (+' + rCost + '€)');
                        }
                        if (document.getElementById('album-25x30').checked) detailsArray.push('Àlbum 25x30 polipell (+275€)');
                        if (document.getElementById('album-30x30').checked) detailsArray.push('Àlbum 30x30 polipell (+350€)');
                        if (document.getElementById('album-30x40').checked) detailsArray.push('Àlbum 30x40 polipell (+390€)');
                        
                        const km = parseFloat(document.getElementById('input-km').value) || 0;
                        if (km > 0) detailsArray.push(km + ' km desplaçament');

                        document.getElementById('service-details-hidden').value = detailsArray.join(' | ');

                        const name1 = document.getElementById('input-name1').value.trim() || 'Membre 1';
                        const name2 = document.getElementById('input-name2').value.trim() || 'Membre 2';

                        let notesArray = [];

                        if (isWedding) {
                            const h1Time = document.getElementById('time-house1').value;
                            const h1Place = document.getElementById('place-house1').value;
                            if(h1Time || h1Place) notesArray.push('Casa ' + name1 + ': ' + (h1Time || '--:--') + ' - ' + (h1Place || ''));

                            const h2Time = document.getElementById('time-house2').value;
                            const h2Place = document.getElementById('place-house2').value;
                            if(h2Time || h2Place) notesArray.push('Casa ' + name2 + ': ' + (h2Time || '--:--') + ' - ' + (h2Place || ''));

                            const cTime = document.getElementById('time-ceremony').value;
                            const cPlace = document.getElementById('place-ceremony').value;
                            if(cTime || cPlace) notesArray.push('Cerimònia: ' + (cTime || '--:--') + ' - ' + (cPlace || ''));

                            const rTime = document.getElementById('time-restaurant').value;
                            const rPlace = document.getElementById('place-restaurant').value;
                            if(rTime || rPlace) notesArray.push('Restaurant: ' + (rTime || '--:--') + ' - ' + (rPlace || ''));
                        } else {
                            const photoTime = document.getElementById('photo-time').value;
                            const photoPlace = document.getElementById('photo-place').value;
                            if(photoTime || photoPlace) notesArray.push('Lloc i Hora: ' + (photoTime || '--:--') + ' - ' + (photoPlace || ''));
                        }

                        const extraNotes = document.getElementById('extra-notes').value;
                        if(extraNotes) notesArray.push('Observacions: ' + extraNotes);

                        document.getElementById('notes-hidden').value = notesArray.join(' | ');

                        document.getElementById('main-client-form').submit();
                    }

                    function prepareWebFormAndSubmit(event) {
                        return true;
                    }

                    window.onload = function() {
                        if (document.getElementById('photo-pack-select')) {
                            onPackChange();
                            updateTimelineLabels();
                        }
                        if (document.getElementById('web-pack-select')) {
                            calculateWebTotal();
                        }
                    };
                </script>
            </head>
            <body>
                <div class="container">
                    <header>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            ${headerLogoHtml}
                            <h1 style="margin: 0; font-size: 1.4rem; color: ${themeColor};">${headerTitleHtml}</h1>
                        </div>
                        <div class="user-info">
                            Connectat com <strong>${username}</strong> 
                            <a href="/">Tancar sessió</a>
                        </div>
                    </header>

                    <div class="tabs">
                        <a href="/panel?user=${encodeURIComponent(username)}&category=Fotografia" class="tab ${currentCategory === 'Fotografia' ? 'active-photo' : ''}">📷 Fotografia</a>
                        <a href="/panel?user=${encodeURIComponent(username)}&category=Web" class="tab ${currentCategory === 'Web' ? 'active-web' : ''}">💻 Disseny Web</a>
                        <a href="/panel?user=${encodeURIComponent(username)}&category=all" class="tab" style="${currentCategory === 'all' ? 'background:#334155; color:white;' : ''}">📋 Tots els Clients</a>
                    </div>

                    <div class="grid">
                        ${!isAll ? `<div class="card">${formContent}</div>` : ''}

                        <div class="card" ${isAll ? 'style="grid-column: 1 / -1;"' : ''}>
                            <h3>Projectes Registrats (${currentCategory === 'all' ? 'Tots' : currentCategory})</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Client / Data</th>
                                        <th>Contacte</th>
                                        <th>Detalls del Servei</th>
                                        <th>Import & Pagaments</th>
                                        <th>Estat</th>
                                        <th style="text-align: right;">Accions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${clientsRows.length > 0 ? clientsRows : '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding: 40px;">Cap registre trobat.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error carregant les dades");
    }
});

// 5. Guardar client nou
app.post('/add-client', async (req, res) => {
    const { name1, phone1, name2, phone2, email, category, event_date, service_details, estimated_price, deposit, deposit_date, status, notes, web_domain_hosting, user } = req.body;
    const finalDeposit = deposit ? parseFloat(deposit) : 0;
    const finalPrice = estimated_price ? parseFloat(estimated_price) : 0;

    try {
        await pool.query(
            `INSERT INTO clients (name1, phone1, name2, phone2, email, category, event_date, service_details, estimated_price, deposit, deposit_date, status, notes, web_domain_hosting) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [name1, phone1, name2 || null, phone2 || null, email, category, event_date || null, service_details || '', finalPrice, finalDeposit, deposit_date || null, status, notes || '', web_domain_hosting || null]
        );
        res.redirect('/panel?user=' + encodeURIComponent(user || 'JORDIttwCrm') + '&category=' + category);
    } catch (err) {
        console.error('Error al guardar:', err.message);
        res.status(500).send("Error guardant client");
    }
});

// 6. Vista per Editar Client
app.get('/edit-client/:id', async (req, res) => {
    const clientId = req.params.id;
    const username = req.query.user || 'JORDIttwCrm';

    try {
        const result = await pool.query("SELECT * FROM clients WHERE id = $1", [clientId]);
        const client = result.rows[0];

        if (!client) {
            return res.send("Client no trobat. <a href='/panel?user=" + encodeURIComponent(username) + "'>Tornar</a>");
        }

        const isPhoto = client.category === 'Fotografia';
        const titleName = isPhoto ? `${client.name1}${client.name2 ? ' & ' + client.name2 : ''}` : client.name1;

        let editExtraFields = '';
        if (isPhoto) {
            editExtraFields = `
                <label>Dades del Client / Família</label>
                <div class="couple-grid">
                    <div>
                        <label style="margin-top:0;">Nom 1</label>
                        <input type="text" name="name1" value="${client.name1 || ''}" required>
                        <label style="margin-top:8px;">Telèfon 1</label>
                        <input type="text" name="phone1" value="${client.phone1 || ''}">
                    </div>
                    <div>
                        <label style="margin-top:0;">Nom 2 (Opcional)</label>
                        <input type="text" name="name2" value="${client.name2 || ''}">
                        <label style="margin-top:8px;">Telèfon 2</label>
                        <input type="text" name="phone2" value="${client.phone2 || ''}">
                    </div>
                </div>
            `;
        } else {
            editExtraFields = `
                <label>Nom del Client</label>
                <input type="text" name="name1" value="${client.name1 || ''}" required>
                <label style="margin-top:8px;">Telèfon</label>
                <input type="text" name="phone1" value="${client.phone1 || ''}">
                
                <label>Estat de Domini i Hosting</label>
                <select name="web_domain_hosting" required>
                    <option value="Té domini i hosting" ${client.web_domain_hosting === 'Té domini i hosting' ? 'selected' : ''}>Té domini i hosting</option>
                    <option value="Només hosting" ${client.web_domain_hosting === 'Només hosting' ? 'selected' : ''}>Només hosting</option>
                    <option value="Només domini" ${client.web_domain_hosting === 'Només domini' ? 'selected' : ''}>Només domini</option>
                    <option value="No té ni domini ni hosting" ${client.web_domain_hosting === 'No té ni domini ni hosting' ? 'selected' : ''}>No té ni domini ni hosting</option>
                </select>
            `;
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="ca">
            <head>
                <meta charset="UTF-8">
                <title>Editar Client - ${titleName}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background: #fef2f2; margin: 0; padding: 40px; color: #1e293b; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #fecaca; }
                    h2 { margin-top: 0; color: #991b1b; }
                    label { display: block; font-weight: 600; font-size: 0.82rem; color: #991b1b; margin-bottom: 4px; margin-top: 12px; text-transform: uppercase; }
                    input, select, textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; background: #f9fafb; }
                    .couple-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 4px; }
                    button { background: #991b1b; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%; margin-top: 20px; font-size: 1rem; }
                    button:hover { background: #7f1d1d; }
                    .back { display: block; margin-top: 15px; text-align: center; color: #64748b; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Editar Projecte: ${titleName}</h2>
                    <form action="/update-client/${client.id}" method="POST">
                        <input type="hidden" name="user" value="${username}">
                        
                        ${editExtraFields}

                        ${isPhoto ? '<label>Data de l\'Esdeveniment</label><input type="date" name="event_date" value="' + (client.event_date || '') + '" required>' : ''}

                        <label>Email</label>
                        <input type="email" name="email" value="${client.email}" required>

                        <label>Serveis i Detalls</label>
                        <input type="text" name="service_details" value="${client.service_details || ''}">

                        <label>Preu Total (€)</label>
                        <input type="number" name="estimated_price" step="0.01" value="${client.estimated_price || 0}" required>

                        <label>Diners a Compte / Senyal (€)</label>
                        <input type="number" name="deposit" step="0.01" value="${client.deposit || 0}">

                        <label>Data de l'Entrega de la Senyal</label>
                        <input type="date" name="deposit_date" value="${client.deposit_date || ''}">

                        <label>Estat</label>
                        <select name="status">
                            <option value="Pendent" ${client.status === 'Pendent' ? 'selected' : ''}>Pendent</option>
                            <option value="Contractat" ${client.status === 'Contractat' ? 'selected' : ''}>Contractat</option>
                            <option value="Finalitzat" ${client.status === 'Finalitzat' ? 'selected' : ''}>Finalitzat</option>
                        </select>

                        <label>Notes</label>
                        <textarea name="notes" rows="4">${client.notes || ''}</textarea>

                        <button type="submit">Guardar Canvis</button>
                    </form>
                    <a href="/panel?user=${encodeURIComponent(username)}" class="back">← Tornar al Panell</a>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send("Error carregant client");
    }
});

// 7. Processar Actualització
app.post('/update-client/:id', async (req, res) => {
    const clientId = req.params.id;
    const { name1, phone1, name2, phone2, email, event_date, service_details, estimated_price, deposit, deposit_date, status, notes, web_domain_hosting, user } = req.body;
    const finalDeposit = deposit ? parseFloat(deposit) : 0;
    const finalPrice = estimated_price ? parseFloat(estimated_price) : 0;

    try {
        await pool.query(
            `UPDATE clients SET name1 = $1, phone1 = $2, name2 = $3, phone2 = $4, email = $5, event_date = $6, service_details = $7, estimated_price = $8, deposit = $9, deposit_date = $10, status = $11, notes = $12, web_domain_hosting = $13 WHERE id = $14`,
            [name1, phone1, name2 || null, phone2 || null, email, event_date || null, service_details || '', finalPrice, finalDeposit, deposit_date || null, status, notes || '', web_domain_hosting || null, clientId]
        );
        res.redirect('/panel?user=' + encodeURIComponent(user || 'JORDIttwCrm'));
    } catch (err) {
        console.error('Error al actualitzar:', err.message);
        res.status(500).send("Error actualitzant client");
    }
});

// 8. Generar fitxer .ICS
app.get('/download-ics/:id', async (req, res) => {
    const clientId = req.params.id;

    try {
        const result = await pool.query("SELECT * FROM clients WHERE id = $1", [clientId]);
        const client = result.rows[0];
        if (!client) return res.status(404).send("Client no trobat.");

        const rawDate = client.event_date ? client.event_date.replace(/-/g, '') : '20261231';
        const clientNames = `${client.name1}${client.name2 ? ' & ' + client.name2 : ''}`;
        const phonesStr = [client.phone1, client.phone2].filter(Boolean).join(' / ');

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Estudi Jordi CRM//CA',
            'BEGIN:VEVENT',
            `UID:client-${client.id}@estudijordi.local`,
            `DTSTAMP:${rawDate}T100000Z`,
            `DTSTART;VALUE=DATE:${rawDate}`,
            `SUMMARY:Fotografia: ${clientNames}`,
            `DESCRIPTION:Servei: ${client.service_details}\\nTelèfons: ${phonesStr}\\nNotes: ${client.notes || 'Sense notes'}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="foto-${client.name1.replace(/\s+/g, '_')}.ics"`);
        res.send(icsContent);
    } catch (err) {
        res.status(500).send("Error descarregant calendari");
    }
});

// 9. Vista PDF / Pressupost
app.get('/view-pdf/:id', async (req, res) => {
    const clientId = req.params.id;

    try {
        const result = await pool.query("SELECT * FROM clients WHERE id = $1", [clientId]);
        const client = result.rows[0];
        if (!client) return res.status(404).send("Client no trobat.");

        const isPhoto = client.category === 'Fotografia';
        const totalPrice = parseFloat(client.estimated_price) || 0;
        const deposit = parseFloat(client.deposit) || 0;
        const pending = totalPrice - deposit;
        const formattedEventDate = formatDate(client.event_date);
        const formattedDepositDate = formatDate(client.deposit_date);

        const titleName = isPhoto ? `${client.name1}${client.name2 ? ' & ' + client.name2 : ''}` : client.name1;
        const serviceItems = (client.service_details || '').split(' | ').map(i => `<li>${i}</li>`).join('');
        const notesItems = (client.notes || '').split(' | ').map(i => `<li>${i}</li>`).join('');

        const logoJordiUrl = "https://jordimor.com/wp-content/uploads/2019/07/jordi-mor-web.png";
        const logoTTWUrl = "https://tutensweb.com/wp-content/uploads/2018/09/logo.png.webp";
        const pdfLogo = isPhoto ? logoJordiUrl : logoTTWUrl;
        const brandName = isPhoto ? 'Estudi Jordi — Fotografia' : 'TTW — Disseny Web';

        let clientDetailsHtml = '';
        if (isPhoto) {
            clientDetailsHtml = `
                <strong>Client / Família:</strong><br>
                • ${client.name1} (Tel: ${client.phone1 || 'No indicat'})<br>
                ${client.name2 ? '• ' + client.name2 + ' (Tel: ' + (client.phone2 || 'No indicat') + ')<br>' : ''}
                <strong>Correu electrònic:</strong> ${client.email}
            `;
        } else {
            clientDetailsHtml = `
                <strong>Client:</strong> ${client.name1}<br>
                <strong>Telèfon:</strong> ${client.phone1 || 'No indicat'}<br>
                <strong>Correu electrònic:</strong> ${client.email}<br>
                <strong>Estat Domini/Hosting:</strong> ${client.web_domain_hosting || 'No especificat'}
            `;
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="ca">
            <head>
                <meta charset="UTF-8">
                <title>Pressupost - ${titleName}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; margin: 0; }
                    .invoice { max-width: 800px; margin: 0 auto; background: white; padding: 50px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                    h1 { margin: 0; color: #991b1b; font-size: 1.5rem; }
                    .details { margin-bottom: 30px; line-height: 1.6; }
                    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
                    th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
                    th { background: #f1f5f9; color: #475569; font-size: 0.85rem; text-transform: uppercase; }
                    ul { margin: 0; padding-left: 18px; line-height: 1.5; }
                    li { margin-bottom: 4px; }
                    .totals { float: right; width: 340px; margin-top: 20px; }
                    .totals div { display: flex; justify-content: space-between; padding: 8px 0; font-size: 1rem; }
                    .totals .total-final { font-weight: bold; font-size: 1.2rem; color: #991b1b; border-top: 2px solid #1e293b; padding-top: 10px; margin-top: 5px; }
                    .btn-print { display: block; width: 100%; background: #2563eb; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer; text-align: center; text-decoration: none; margin-top: 50px; }
                    @media print { .btn-print { display: none; } body { background: white; padding: 0; } .invoice { box-shadow: none; padding: 0; } }
                </style>
            </head>
            <body>
                <div class="invoice">
                    <div class="header">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="${pdfLogo}" alt="Logo" style="height: 45px; object-fit: contain;">
                            <div>
                                <h1>${brandName}</h1>
                                <p style="color: #64748b; margin: 5px 0 0;">Pressupost i Detalls del Servei</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            ${isPhoto ? '<strong>Data Esdeveniment:</strong> ' + formattedEventDate + '<br>' : ''}
                            <small style="color: #64748b;">Estat: ${client.status}</small>
                        </div>
                    </div>

                    <div class="details">
                        ${clientDetailsHtml}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Concepte del Servei</th>
                                <th style="text-align: right;">Import</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <strong>Serveis contractats:</strong>
                                    ${serviceItems ? `<ul>${serviceItems}</ul>` : '<p style="margin:5px 0;">' + (client.service_details || 'Servei general') + '</p>'}
                                    ${client.notes ? `<br><strong>Observacions:</strong><ul>${notesItems}</ul>` : ''}
                                </td>
                                <td style="text-align: right;">${totalPrice.toLocaleString('ca-ES', {style: 'currency', currency: 'EUR'})}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="totals">
                        <div><span>Import Total:</span> <strong>${totalPrice.toLocaleString('ca-ES', {style: 'currency', currency: 'EUR'})}</strong></div>
                        <div><span>Senyal ${client.deposit_date ? '('+formattedDepositDate+')' : ''}:</span> <strong>-${deposit.toLocaleString('ca-ES', {style: 'currency', currency: 'EUR'})}</strong></div>
                        <div class="total-final"><span>Pendent a Pagament:</span> <span>${pending.toLocaleString('ca-ES', {style: 'currency', currency: 'EUR'})}</span></div>
                    </div>

                    <div style="clear: both;"></div>

                    <button class="btn-print" onclick="window.print()">Imprimir / Desar com a PDF</button>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send("Error carregant el PDF");
    }
});

// 10. Eliminar client
app.post('/delete-client', async (req, res) => {
    const { id, user, category } = req.body;
    try {
        await pool.query(`DELETE FROM clients WHERE id = $1`, [id]);
        res.redirect('/panel?user=' + encodeURIComponent(user || 'JORDIttwCrm') + '&category=' + (category || 'Fotografia'));
    } catch (err) {
        res.status(500).send("Error eliminant client");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor en marxa al port ${PORT}`);
});