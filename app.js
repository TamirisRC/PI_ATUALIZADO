const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');

const app = express();
app.use(session({ secret: 'ssshhhhh', resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

const hbs = exphbs.create({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
    extname: '.handlebars'
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

///////////// CONEXÃO COM BANCO DE DADOS ///////////////
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'academicmanager'
});

db.connect((err) => {
    if (err) {
        console.log('Erro ao conectar banco de dados', err);
        return;
    }
    console.log('Conexão estabilizada!');
});

/////////////////////////////////////////////// ROTAS PARA REDERINZAR AS PÁGINAS ////////////////////////////////////////////////////////////////////
app.get('/', (req, res) => {
    req.session.destroy();
    res.render('login', { message: '', showMenu: false });
});

app.post('/log', (req, res) => {
    var email = req.body.email;
    var pass = req.body.pass;

    var query = 'SELECT * FROM professores WHERE email = ? AND pass = ?';
    db.query(query, [email, pass], function (err, results) {
        if (err) {
            console.error('Erro na consulta:', err);
            res.render('login', { message: 'Erro interno.' });
            return;
        }

        if (results.length > 0) {
            req.session.user = results[0];
            var role = results[0].role;
            var userId = results[0].id;

            switch (role) {
                case 'admin':
                    res.redirect('/admin/' + userId);
                    break;
                case 'representante_tg':
                    res.redirect('/representante_tg/' + userId); 
                    break;               
                default:
                    res.render('error', { message: 'Tipo de usuário não reconhecido.' });
            }
        } else {
            res.render('login', { message: 'Login incorreto!' });
        }
    });
});

//Rota do Admin
app.get('/admin/:id', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        res.render('admin', { user: req.session.user, showMenu: true });
    } else {
        res.redirect('/');
    }
});

//Rota do representante
app.get('/representante_tg/:id', (req, res) => {
    if (req.session.user && req.session.user.role === 'representante_tg') {
        res.render('representante_tg', { user: req.session.user, showMenu: true });
    } else {
        res.redirect('/');
    }
});

app.get('/contas_alunos', (req, res) => {
    res.render('contas_alunos');
});

app.get('/turmas', (req, res) => {
    db.query('SELECT id, nome FROM turmas', (error, results) => {
        if (error) {
            console.error('Erro na consulta:', error); 
            return res.status(500).send('Erro no servidor'); 
        }
        console.log('Resultados da consulta:', results); 
        res.render('turmas', { turmas: results });
    });
});

app.get('/semestre', (req, res) => {
    const cards = [
        { semestre: 1, title: "1º Bimestre" },
        { semestre: 2, title: "2º Bimestre" },
        { semestre: 3, title: "3º Bimestre" },
        { semestre: 4, title: "4º Bimestre" }
    ];

    res.render('semestre', { cards });
});

app.get('/plano-adaptativo', (req, res) => {
    const { semestre } = req.query; 
    res.render('plano-adaptativo', { semestre });
});

////////////////////////////////////////////// FIM DA REDERINZAÇÃO DAS TELAS ////////////////////////////////////////////////////



///////////////////////////////////////////CRUD PARA OS ALUNOS ///////////////////////////////////////////////////
app.post('/alunos/add', (req, res) => {
    const { nome, cpf, ra, email } = req.body;

    if (!nome || !cpf || !ra || !email) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const userQuery = 'INSERT INTO alunos (nome, cpf, ra, email) VALUES (?, ?, ?, ?)';
    
    db.query(userQuery, [nome, cpf, ra, email], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao adicionar usuário' });
        }
        res.json({ success: true, message: 'Usuário adicionado com sucesso!' });
    });
});

app.post('/alunos/edit', (req, res) => {
    const { id, ra, email } = req.body;

    const userQuery = 'UPDATE alunos SET email = ?, ra = ? WHERE id = ?';

    db.query(userQuery, [email, ra, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao editar usuário' });
        }
        res.json({ success: true, message: 'Usuário editado com sucesso!' });
    });
});

app.post('/alunos/delete', (req, res) => {
    const { id } = req.body;

    const deleteUserQuery = 'DELETE FROM alunos WHERE id = ?';

    db.query(deleteUserQuery, [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao excluir usuário' });
        }
        res.json({ success: true, message: 'Usuário excluído com sucesso!' });
    });
});

//////////////////////////////////////////// FIM DO CRUD DOS ALUNOS /////////////////////////////////////////////////

///////////////////////////////////////////// CRUD PARA OS PROFESSORES /////////////////////////////////////////

app.get('/users', (req, res) => {
    const query = 'SELECT * FROM professores';
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao buscar usuários' });
        }
        res.json(results);
    });
});

app.post('/users/add', (req, res) => {
    const { nome, email, senha, role } = req.body;
    
    if (!nome || !email || !senha || !role) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const userQuery = 'INSERT INTO professores (email, pass, role) VALUES (?, ?, ?)';
    
    db.query(userQuery, [email, senha, role], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao adicionar usuário' });
        }
        res.json({ success: true, message: 'Usuário adicionado com sucesso!' });
    });
});

app.post('/users/edit', (req, res) => {
    const { id, nome, email, senha, role } = req.body;

    const userQuery = 'UPDATE professores SET email = ?, pass = ?, role = ? WHERE id = ?';

    db.query(userQuery, [email, senha, role, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao editar usuário' });
        }
        res.json({ success: true, message: 'Usuário editado com sucesso!' });
    });
});

app.post('/users/delete', (req, res) => {
    const { id } = req.body;

    const deleteUserQuery = 'DELETE FROM professores WHERE id = ?';

    db.query(deleteUserQuery, [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao excluir usuário' });
        }
        res.json({ success: true, message: 'Usuário excluído com sucesso!' });
    });
});

///////////////////////////////// FIM DO CRUD PARA OS PROFESSORES ////////////////////////////////////////////

////////////////////////////////// CRUD PARA PLANO ADAPTATIVO ////////////////////////////////////////////////

app.get('/planos', (req, res) => {
    const { turma_id, semestre } = req.query;

    const query = 'SELECT * FROM planos WHERE turma_id = ? AND semestre = ?';
    db.query(query, [turma_id, semestre], (err, results) => {
        if (err) {
            console.error('Erro na consulta:', err);
            return res.status(500).json({ error: 'Erro no servidor' });
        }
        res.json(results);
    });
});

app.post('/planos/add', (req, res) => {
    const { nome, descricao, turma_id, semestre } = req.body;

    if (!nome || !descricao || !turma_id || !semestre) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const userQuery = 'INSERT INTO planos (nome, descricao, turma_id, semestre) VALUES (?, ?, ?, ?)';

    db.query(userQuery, [nome, descricao, turma_id, semestre], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao adicionar plano' });
        }
        res.json({ success: true, message: 'Plano adicionado com sucesso!' });
    });
});

app.put('/planos/edit/:id', (req, res) => {
    const { id } = req.params;
    const { nome, descricao } = req.body;

    const userQuery = 'UPDATE planos SET nome = ?, descricao = ? WHERE id = ?';

    db.query(userQuery, [nome, descricao, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao editar plano' });
        }
        res.json({ success: true, message: 'Plano editado com sucesso!' });
    });
});

app.delete('/planos/delete/:id', (req, res) => {
    const { id } = req.params;

    const deleteUserQuery = 'DELETE FROM planos WHERE id = ?';

    db.query(deleteUserQuery, [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao excluir plano' });
        }
        res.json({ success: true, message: 'Plano excluído com sucesso!' });
    });
});

/////////////////////////////////////// FIM DO CRUD PARA PLANO ADAPTATIVO ///////////////////////////////////////

//////////// INICIA O SERVIDOR /////////////////
app.listen(8081, () => console.log('Servidor Ativo!'));
