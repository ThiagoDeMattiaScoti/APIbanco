//#region configurações da aplicação
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');

app.use(express.json())
app.listen(8080);

const pessoas = [];
//#endregion

//#region middlewares
function verificadorDeExistenciaDeContaCPF(request, response, next){ //Middleware
    const { cpf } = request.headers;
    const pessoa = pessoas.find((pessoa) => pessoa.cpf === cpf);
    if (!pessoa) return response.status(400).json({error: "Cliente não encontrado!"});

    request.pessoa = pessoa;

    return next();
}

function getSaldo(extratos){
    const saldo = extratos.reduce((acc, operation) => {
    if(operation.tipo === 'credito'){
            return acc + operation.quanto
        } else{
            return acc - operation.quanto;
        }
    }, 0);
    return saldo;
}
//#endregion

//#region aplicação
app.post('/account', (request, response)=>{ //criar conta e verificar cpf
    const { cpf, nome } = request.body;    
    const clienteExistente = pessoas.some((pessoas) => pessoas.cpf === cpf)

    if (clienteExistente){
        return response.status(400).json({error: "Cliente já existente"})
    }

    pessoas.push({
        cpf,
        nome,
        id: uuidv4(),
        extratos: []
    })
    console.log(pessoas)
    return response.status(201).send();
})

app.get('/extrato', verificadorDeExistenciaDeContaCPF, (request, response)=>{ //ve extratos e verifica se conta existe
    const {pessoa} = request;
    return response.json(pessoa.extratos)
})

app.post('/deposito', verificadorDeExistenciaDeContaCPF, (request, response)=>{ //deposita dinheiro na conta
    const { quanto, descricao } = request.body;
    const { pessoa } = request;

    const operacaoExtrato = {
        descricao,
        quanto,
        created_at: new Date(),
        tipo: "credito"
    }

    pessoa.extratos.push(operacaoExtrato);

    return response.status(201).send();
})

app.post('/saque', verificadorDeExistenciaDeContaCPF, (request,response)=>{ //faz um saque se tem saldo siponivel
    const {quanto} = request.body;
    const {pessoa} = request;
    const saldo = getSaldo(pessoa.extratos);

    const operacaoExtrato = {
        quanto,
        created_at: new Date(),
        tipo: 'debito'
    };

    if (saldo<quanto){
        return response.status(400).json({error: 'Saldo insuficiente!'})
    };
    pessoa.extratos.push(operacaoExtrato);
    return response.status(201).send()
})

app.get('/extrato/data', verificadorDeExistenciaDeContaCPF, (request, response)=>{ //ve extratos e verifica se conta existe
    const {pessoa} = request;
    const {data} = request.query;

    const dataFormato = new Date(data + " 00:00");

    const extrato = pessoa.extratos.filter((extrato) => extrato.created_at.toDateString() === new Date(dataFormato).toDateString());

    return response.json(extrato)
})

app.put('/account', verificadorDeExistenciaDeContaCPF, (request, response)=>{ //atualiza dados da conta
    const { nome } = request.body;
    const { pessoa } = request;

    pessoa.nome = nome;
    return response.status(201).send();
})

app.get('/account', verificadorDeExistenciaDeContaCPF, (request,response)=>{ //ve os dados da conta
    const { pessoa } = request;
    return response.json(pessoa);
})

app.delete('/account', verificadorDeExistenciaDeContaCPF, (request, response)=>{
    const { pessoa } = request;
    
    pessoas.splice(pessoa, 1);

    return response.status(200).json(pessoas);
})

app.get('/saldo', verificadorDeExistenciaDeContaCPF, (request, response)=>{
    const { pessoa } = request;
    const saldo = getSaldo(pessoa.extratos)

    return response.json(saldo);
})
//#endregion