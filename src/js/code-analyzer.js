import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

var input;
var condDict;

const codeToArray = (codeToParse, vectorToParse) => {
    input = parseInput(vectorToParse, ';');
    condDict = {};
    var tableData = [];
    var parsedObject = esprima.parseScript(codeToParse, { loc: true });
    let functionIndex = globalHandler(parsedObject, tableData);
    tableData = jsonToArray(parsedObject.body[functionIndex], tableData);
    return parsedObject;
};

const jsonToArray = (jsonObject, table) => {
    if (jsonObject.type == 'FunctionDeclaration') {
        functionHandler(jsonObject, table);
    } else if (jsonObject.type == 'WhileStatement') {
        whileHandler(jsonObject, table);
    } else {
        otherJsonToArray(jsonObject, table);
    }

    return table;
};

const otherJsonToArray = (jsonObject, table) => {
    if (jsonObject.type == 'IfStatement') {
        ifHandler(jsonObject, table);
    } else if (jsonObject.type == 'ExpressionStatement') {
        assignmentHandler(jsonObject, table);
    } else if (jsonObject.type == 'VariableDeclaration') {
        vardecHandler(jsonObject, table);
    } else if (jsonObject.type == 'ReturnStatement') {
        returnHandler(jsonObject, table);
    }
    return table;
};

const functionHandler = (jsonObject, table) => {
    for (let i = 0; i < jsonObject.params.length; i++) {
        paramHandler(jsonObject.params[i], input[i], table);
    }
    jsonObject.body.body = removeStatements(jsonObject.body.body, table);
    return table;
};

const whileHandler = (jsonObject, table) => {
    let oldTable = Array.from(table);
    condExtract(jsonObject, table);
    condDict[jsonObject.loc.start.line] = { cond: escodegen.generate(jsonObject.test), value: null };
    (jsonObject.body.body === undefined) ? jsonToArray(jsonObject.body, table) :
        jsonObject.body.body = removeStatements(jsonObject.body.body, table);
    table = oldTable;
    return table;
};

const ifHandler = (jsonObject, table) => {
    let oldTable = Array.from(table);
    condExtract(jsonObject, table);
    //table[table.length - 1][5] = jsonObject.test;
    condDict[jsonObject.loc.start.line] = { cond: jsonObject.test, value: evalCond(jsonObject.test, table) };
    jsonObject.consequent.body === undefined ? jsonToArray(jsonObject.consequent, table) :
        jsonObject.consequent.body = removeStatements(jsonObject.consequent.body, table);
    table = oldTable;
    if (jsonObject.alternate !== null) {
        table = oldTable;
        jsonObject.alternate.body === undefined ? jsonToArray(jsonObject.alternate, table) :
            jsonObject.alternate.body = removeStatements(jsonObject.alternate.body, table);
    }
    table = oldTable;
    return table;
};

const condExtract = (jsonObject, table) => {
    if (jsonObject.test.type == 'Identifier') {
        identifierExtract(jsonObject, table);
    }
    else if (jsonObject.test.type == 'MemberExpression') {
        jsonObject.test = getElementValue(jsonObject.test, table);
    }
    else if (jsonObject.test.type == 'BinaryExpression')
        binaryExpHandler(jsonObject.test, table);
};

const identifierExtract = (jsonObject, table) => {
    let type = getType(jsonObject.test.name, table);
    if (type == 'local') {
        let version = getVersion(jsonObject.test.name, 'cond', table);
        jsonObject.test = getValue(jsonObject.test.name, version, table);
    }
};

const assignmentHandler = (jsonObject, table) => {
    var row = [];
    row.push(jsonObject.loc.start.line); row.push(jsonObject.loc.start.column);
    row.push('assignment'); row.push(jsonObject.expression.left.name);
    row.push(getVersion(jsonObject.expression.left.name, 'assignment', table));
    row.push(jsonObject.expression.right); row.push(null); table.push(row);
    if (jsonObject.expression.right.type == 'Identifier') {
        if (getType(jsonObject.expression.right.name, table) == 'local') {
            let version = getVersion(jsonObject.expression.right.name, 'occurence', table);
            jsonObject.expression.right = getValue(jsonObject.expression.right.name, version, table);
            table[table.length - 1][5] = jsonObject.expression.right;
        }
    }
    else assExtract(jsonObject, table);
    return table;
};

const assExtract = (jsonObject, table) => {
    if (jsonObject.expression.right.type == 'MemberExpression') {
        jsonObject.expression.right = getElementValue(jsonObject.expression.right, table);
    }
    else if (jsonObject.expression.right.type == 'BinaryExpression')
        binaryExpHandler(jsonObject.expression.right, table);
    else if (jsonObject.expression.right.type == 'Literal')
        table[table.length - 1][5] = jsonObject.expression.right; table[table.length - 1][6] = jsonObject.expression.right;
};

const globalHandler = (jsonObject, table) => {
    let index = -1, row, globDecl;
    for (let i = 0; i < jsonObject.body.length; i++) {
        if (jsonObject.body[i].type != 'FunctionDeclaration') {
            globDecl = jsonObject.body[i];
            globDecl.declarations.forEach(vardec => {
                row = [];
                row.push(vardec.id.loc.start.line); row.push(vardec.id.loc.start.column);
                row.push('global'); row.push(vardec.id.name); row.push(1);
                row.push(vardec);
                row.push(vardec.init);
                table.push(row);
            });
        } else
            index = i;
    }
    return index;
};

const vardecHandler = (jsonObject, table) => {
    var row = [];
    jsonObject.declarations.forEach(vardec => {
        row.push(vardec.id.loc.start.line);
        row.push(vardec.id.loc.start.column);
        row.push('local');
        row.push(vardec.id.name);
        row.push(1);
        vardec.init == null ? row.push(null) : row.push(vardec.init);
        row.push(null);
        table.push(row);
        if (vardec.init != null) {
            vardecLogic(vardec, table);
        }
        row = [];
    });
    return table;
};

const vardecLogic = (vardec, table) => {
    if (vardec.init.type == 'Identifier') {
        if (getType(vardec.init.name, table) == 'local') {
            let version = getVersion(vardec.init.name, 'occurence', table);
            vardec.init = getValue(vardec.init.name, version, table);
            table[table.length - 1][5] = vardec.init;
        }
    }
    else varExtract(vardec, table); 
};

const varExtract = (vardec, table) => {
    if (vardec.init.type == 'Literal') {
        table[table.length - 1][5] = vardec.init; table[table.length - 1][6] = vardec.init;
    }
    else if (vardec.init.type == 'MemberExpression') {
        vardec.init = getElementValue(vardec.init, table);
    }
    else if (vardec.init.type == 'BinaryExpression')
        binaryExpHandler(vardec.init, table);
};

const paramHandler = (jsonObject, value, table) => {
    var row = [];
    row.push(jsonObject.loc.start.line);
    row.push(jsonObject.loc.start.column);
    row.push('param');
    row.push(jsonObject.name);
    row.push(1);
    row.push(jsonObject);
    row.push(value);
    table.push(row);
    return table;
};

const returnHandler = (jsonObject, table) => {
    if (jsonObject.argument.type == 'Identifier') {
        if (getType(jsonObject.argument.name, table) == 'local') {
            let version = getVersion(jsonObject.argument.name, 'return', table);
            jsonObject.argument = getValue(jsonObject.argument.name, version, table);
        }
    }
    else if (jsonObject.argument.type == 'MemberExpression') {
        jsonObject.argument = getElementValue(jsonObject.argument, table);
    }
    else if (jsonObject.argument.type == 'BinaryExpression')
        binaryExpHandler(jsonObject.argument, table);
    return table;
};

const binaryExpHandler = (exp, table) => {
    handleGoLeft(exp, table);
    handleGoRight(exp, table);
};

const handleGoLeft = (exp, table) => {
    if (exp.left.type == 'Identifier') {
        if (getType(exp.left.name, table) == 'local') {
            let version = getVersion(exp.left.name, 'occurence', table);
            exp.left = getValue(exp.left.name, version, table);
        }
    } else if (exp.left.type == 'MemberExpression') {
        exp.left = getElementValue(exp.left, table);
    } else if (exp.left.type == 'BinaryExpression') {
        binaryExpHandler(exp.left, table);
    }
};

const handleGoRight = (exp, table) => {
    if (exp.right.type == 'Identifier') {
        if (getType(exp.right.name, table) == 'local') {
            let version = getVersion(exp.right.name, 'occurence', table);
            exp.right = getValue(exp.right.name, version, table);
        }
    } else if (exp.right.type == 'MemberExpression') {
        exp.right = getElementValue(exp.right, table);
    } else if (exp.right.type == 'BinaryExpression') {
        binaryExpHandler(exp.right, table);
    }
};

const evalCond = (test, table) => {
    let cond = escodegen.generate(test);
    for (let i = 0; i < table.length - 1; i++) {
        if (table[i][6] == null)
            table[i][6] = evalExtract(table[i][5], table);
    }
    let value = eval('(' + escodegen.generate(evalExtract(test, table)) + ')');
    let result = value ? '<green>' + cond + '</green>' : '<red>' + cond + '</red>';
    test.color = result;
    test.evaluation = value;
    return value;
};

const evalExtract = (exp, table) => {
    if (exp.type == 'BinaryExpression') {
        return evalBinaryExp(deepCopy(exp), table);
    }
    else if (exp.type == 'Identifier') {
        return getEval(exp.name, getVersion(exp.name, 'occurence', table), table);

    }
    else if (exp.type == 'Literal') {
        return exp;

    }
    else if (exp.type == 'MemberExpression') {
        return getElementValue(exp, table);
    }
};

const evalBinaryExp = (exp, table) => {
    evalGoLeft(exp, table);
    evalGoRight(exp, table);
    return exp;
};

const evalGoLeft = (exp, table) => {
    if (exp.left.type == 'Identifier') {
        exp.left = getEval(exp.left.name, getVersion(exp.left.name, 'occurence', table), table);
    }
    else if (exp.left.type == 'MemberExpression') {
        exp.left = getElementValue(exp.left, table);
    }
    else if (exp.left.type == 'BinaryExpression') {
        evalBinaryExp(exp.left, table);
    }
};

const evalGoRight = (exp, table) => {
    if (exp.right.type == 'Identifier') {
        exp.right = getEval(exp.right.name, getVersion(exp.right.name, 'occurence', table), table);
    }
    else if (exp.right.type == 'MemberExpression') {
        exp.right = getElementValue(exp.right, table);
    }
    else if (exp.right.type == 'BinaryExpression') {
        evalBinaryExp(exp.right, table);
    }
};

const getValue = (name, version, table) => {
    for (let i = table.length - 1; i >= 0; i--) {
        if (checkEval(table[i][2]) && table[i][3] == name && table[i][4] == version)
            return deepCopy(table[i][5]);
    }
};

const getEval = (name, version, table) => {
    for (let i = table.length - 1; i >= 0; i--) {
        if (checkEval(table[i][2]) && table[i][3] == name && table[i][4] == version)
            return deepCopy(table[i][6]);
    }
};

const getElementValue = (exp, table) => {
    let i = exp.property.type == 'Literal' ? exp.property.value : getEval(exp.property.name, getVersion(exp.property.name, 'property', table), table);
    let arrExp = getValue(exp.object.name, getVersion(exp.object.name, 'property', table), table);
    return deepCopy(arrExp.elements[i]);
};

const checkEval = (type) => {
    return (type == 'local' || type == 'assignment' || type == 'param' || type == 'global');
};

const getType = (name, table) => {
    for (let i = table.length - 1; i >= 0; i--) {
        if (typeCheck(table[i][2]) && table[i][3] == name)
            return table[i][2];
    }
};

const typeCheck = (type) => {
    return (type == 'local' || type == 'param' || type == 'global');
};

const typeCheck2 = (type) => {
    return (type == 'cond' || type == 'return' || type == 'property');
};

const getVersion = (name, type, table) => {
    let recurciveOccurence = true;
    for (let i = table.length - 1; i >= 0; i--) {
        if (table[i][3] == name) {
            let addition = figureAddition(recurciveOccurence, type, table[i][2]);
            return table[i][4] + addition;
        }
        recurciveOccurence = false;
    }
};

const figureAddition = (recurciveOccurence, type, occurence) => {
    return checkEval(type) ? 1 :
        typeCheck2(type) ? 0 :
            recurciveOccurence && occurence != 'param' ? -1 : 0;
};

const deepCopy = (exp) => {
    return esprima.parseScript(escodegen.generate(exp), { loc: true }).body[0].expression;
};

const stringToJson = (str) => {
    return esprima.parseScript(str, { loc: true }).body[0].expression;
};

const removeStatements = (body, table) => {
    for (let i = 0; i < body.length; i++) {
        jsonToArray(body[i], table);
        if (body[i].type == 'VariableDeclaration' ||
            (body[i].type == 'ExpressionStatement' && getType(body[i].expression.left.name, table) == 'local')) {
            body = removeFromArray(body, i);
            i--;
        }
    }
    return body;
};

const parseInput = (vector, char) => {
    let result = [];
    let delimiter = vector.indexOf(char);
    while (delimiter != -1) {
        result.push(stringToJson(vector.substring(0, delimiter)));
        vector = vector.substring(delimiter + 1);
        delimiter = vector.indexOf(char);
    }
    result.push(stringToJson(vector));
    return result;
};

const removeFromArray = (arr, index) => {
    let result = [];
    for (let i = 0; i < arr.length; i++) {
        if (i != index)
            result.push(arr[i]);
    }
    return result;
};
export { jsonToArray };
export { codeToArray };
