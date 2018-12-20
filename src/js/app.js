import $ from 'jquery';
import * as escodegen from 'escodegen';
import {codeToArray} from './code-analyzer';

$(document).ready(function () {
    $('#substitutionButton').click(() => {
        let parsedCode = $('#codePlaceholder').val();
        let vector = $('#vectorPlaceholder').val();
        let evaluatedCode = codeToArray(parsedCode, vector);
        $('#td2').empty();
        $('#td2').append(escodegen.generate(evaluatedCode, {verbatim: 'color'}));
    });
});
