function copyQueries(queries){
    var copy = [];
    if(queries){
        for (var i = 0; i < queries.length; ++i) {
            copy[i] = []
            for(var j = 0; j < queries[i].length; ++j){
                copy[i][j] = queries[i][j].slice()
            }
        }
    }
    return copy
}

function copyQuery(query){
    var copy = [];
    if(query){
        for (var i = 0; i < query.length; ++i) {
            copy[i] = query[i].slice()
        }
    }
    return copy
}

function prettyQuery(query){
    var str = "  [ "
    for(var i = 0; i < query.length; ++i){
        var num = query[i][0]
        if(num < 10){
            num = " " + num
        }
        str += "(" + num + " = " + query[i][1] + ") "
    }
    str += "]\n"
    return str
}

function prettyQueries(queries){
    var str = "{\n"
    if(queries){
        for(var i = 0; i < queries.length; ++i){
            str += prettyQuery(queries[i])
        }
    }
    str += "}\n"
    return str
}

/*
  Apply and unify constraints in the queries.
*/
function applyConstraints(constraints, queries){
    var map = {}
    var result = copyQueries(queries)
    for(var i = 0; i < constraints.length; ++i){
        map[constraints[i][0]] = constraints[i][1]

    }
    for(var j = 0; j < result.length; ++j){
        var query = result[j]
        for(var k = 0; query[k]; ++k){
            var constraint = query[k]
            var letter = map[constraint[0]]

            if(letter) {
                constraint[1] = letter
            }
        }
    }
    return result
}

/*
  Concatenate query as complete word
*/
function asWord(query){
    var word = ""
    for(var k = 0; k < query.length; ++k) word += query[k][1]
    return word
}

/*
  Return quereis as list of words
*/
function asWords(queries){
    var words = []
    if(queries){
        for(var k = 0; k < queries.length; ++k) words.push( asWord( queries[k] ))
    }
    return words
}

/*
  True if the query has no wild cards and is a valid word.
*/
function validWord(query){
    var validWord = false
    if(isComplete(query)){
        var word = ""
        for(var k = 0; k < query.length; ++k) word += query[k][1]
        if(WORD_SET[word]) validWord = true
    }
    return validWord
}

/*
  True if the query has no wild cards.
*/
function isComplete(query){
    var isComplete = true
    for(var j = 0; j < query.length; ++j){
        if(query[j][1] == '?'){
            isComplete = false
            break
        }
    }
    return isComplete
}

/*
  Check queries are valid. i.e. have not created a full incomplete word.
*/
function validQueries(queries){
    var valid = true
    for(var i = 0; i < queries.length; ++i){
        var query = queries[i]
        if(isComplete(query) && !validWord(query)){
            valid = false
            break
        }
    }
    return valid
}

function knownConstraints(queries){
    var map = {}
    for(var i = 0; i < queries.length; ++i){
        var query = queries[i]
        for(var j = 0; j < query.length; ++j){
            var part = query[j]
            if(part[1] != "?"){
                map[part[1]] = part[0]
            }
        }
    }
    return map
}

/*
  Find solution for all word constraints.

*/
function solve(queries, unique, sortfn, known, depth, thinkStart){

    if(!depth) depth = 0
    if(!unique) unique = false
    if(!thinkStart) thinkStart = Date.now()

    if(depth > 0 && thinkStart + 20000 < Date.now()){
        return null
    }

    var result = null
    var copy = copyQueries(queries)
    if(sortfn) copy.sort(sortfn)
    if(!known) known = knownConstraints(copy)

    var seedQuery = copy.shift() // head::rest
    var matches = search(seedQuery, unique, known)

    if(matches.length <= 0){
        return null

    } else {
        var match = null, query = null
        var toSearch = matches.slice()

        while(toSearch.length > 0){

            var rand = Math.floor(Math.random() * toSearch.length)
            var choice = toSearch[rand]
            toSearch = toSearch.slice(0,rand).concat(toSearch.slice(rand+1))

            var constraints = createQuery(seedQuery, choice)
            if(copy.length == 0){
                result = [ constraints ]
                break
            } else {
                var applied = applyConstraints(constraints, copy)
                if(validQueries(applied)){
                    var newKnown = merge(known, constraints)
                    // Apply constraints to the rest of the queries and solve
                    var solved = solve( applied, unique, sortfn, newKnown, depth+1, thinkStart)
                    if(solved){
                        result = [ constraints ].concat( solved )
                        break;
                    }
                }
            }
        }
    }

    if(depth == 0){
        console.log("solve in:", (Date.now() - thinkStart) / 1000, "s")
    }

    return result
}

function merge(mapa, constraints){
    var merged = {}
    if(mapa){
        for(key in mapa) {
            merged[key] = mapa[key]
        }
    }
    for(var i = 0; i < constraints.length; ++i){
        var part = constraints[i]
        if(part[1] != "?"){
            merged[part[1]] = part[0]
        }
    }
    return merged
}

/*
  Create a query with the filled constraints of the seedQuery
*/
function createQuery(seedQuery, match){
    var clone = copyQuery(seedQuery)
    for(var i = 0; i < seedQuery.length; ++i){
        clone[i][1] = match.charAt(i)
    }
    return clone
}

/*
  Verify the query and matching word are valid.
*/
function verifyQuery(query, word, unique, known){
    var valid = true
    if(query.length != word.length){
        valid = false
    } else {
        var local = {}
        outer:
        for(var i = 0; i < query.length; i++){
            var constraint = query[i]
            var sup = constraint[0]
            var cl = constraint[1].charAt(0)
            var wl = word.charAt(i)
            if(cl != '?' && cl != wl){
                valid = false
                break outer

            } else if(unique && known &&
                      (known[wl] && known[wl] != sup ||
                       local[wl] && local[wl] != sup )) {
                valid = false
                break outer

            } else {
                local[wl] = sup
                // test against the rest
                for(var j = i+1; j < query.length; ++j){
                    var rconstraint = query[j]
                    var rsup = rconstraint[0]
                    var rcl = rconstraint[1]
                    var rwl = word.charAt(j)
                    if( sup == rsup && wl != rwl ){
                        valid = false
                        break outer

                    } else if(unique && known &&
                              (known[rwl] && known[rwl] != rsup ||
                               local[rwl] && local[rwl] != rsup )) {
                        valid = false
                        break outer

                    }
                }
            }
        }
    }

    return valid
}

/*
  Validate the list of constraints can generate invalid words.
  i.e. partial words can be verified that there is at least one match

  returns invalid words or empty list
*/
function validateWords(queries){
    var invalid = []
    for(var i = 0; i < queries.length; ++i){
        var query = queries[i]
        var sols = search(query, false)
        if(sols.length == 0){
            invalid.push(query)
        }
    }
    return invalid
}

/*

 Query array example :

 [ [1, '?'], [2, '?'], [3, '?'], [3, '?'], [4, '?'], [5, '?'], [6, '?'], [3, '?'] ]

 This array would search for words that are 8 chars in length that has
 the same letter in the 3rd, 4th and 8th position (letter 3) e.g.

 [ russians, passions, boggling, borrower ... ]

 Because they are all wildcard letters: '?' there are no letter constraints
 but this query would require the letter 'r' in first position:

 [ [1, 'r'], [2, '?'], [3, '?'], [3, '?'], [4, '?'], [5, '?'], [6, '?'], [3, '?'] ]

 ["rattiest", "reddened", "riffraff", "russians", "ruttiest"]

 Note that 'riffraff' is currently returned so it does not enforce by
 default that the letter variables are unique (i.e. 6 and 3 are both 'f')

 If the known constraints map is given e.g. { f : 3, t : 6 } then the
 result will make sure each letter corresponds to a unique number and will not
 override any of the letters given in the known constraints map

*/
function search(query, unique, known){

    var words = WORDS_LEN[query.length]
    var solutions = []

    if(words){
        for(var i = 0; i < words.length; ++i){
            var word = words[i].trim()
            // Requires the same length
            if(word.length == query.length){
                if(verifyQuery(query, word, unique, known)){
                    solutions.push( word )
                }
            }
        }
    }

    return solutions
}

// first letter must be included
var testLetters = [ 'i', 'y', 'l', 'h', 'f', 'j', 'e', 'l', 's']

/*
  Check all letters are present
*/
function verifyLetters(word, letters){
    var valid  = true
    for(var j = 0; j < word.length; ++j){

        var wordLetter = word.charAt(j)

        var found = false
        for(var k = 0; k < letters.length; ++k){
            if(letters[k] == wordLetter){
                found = true
            }
        }
        if(!found){
            valid = false
            break
        }
    }
    return valid
}

/*
  Extra check that letter is used only once.
  Done after passed other validation.
*/
function verifyLetterCount(word, letters){
    var valid = true
    var copyLetters = letters.slice()

    for(var j = 0; j < word.length; ++j){

        var wordLetter = word.charAt(j)
        var found = false

        for(var k = 0; k < copyLetters.length; ++k){
            if(copyLetters[k] == wordLetter){
                found = true
                break
            }
        }
        if(found){
            copyLetters = copyLetters.slice(0,k).concat(copyLetters.slice(k+1))
        } else {
            valid = false
            break
        }
    }
    return valid
}

/*
  Search for anagrams of the given letter set, including subsets (i.e. not all letters used)
*/
function searchAnagrams(letters){

    var startTime = Date.now()

    var solutions = []
    for(var i = 0; i < WORDS.length; ++i){

        var word = WORDS[i].trim()
        // Requires the first letter
        if(word.length >= 4 && word.indexOf(letters[0]) > 0){
            // Check other letters and that they are used only once
            if(verifyLetters(word, letters) && verifyLetterCount(word, letters)){
                solutions.push(word)
            }
        }
    }
    var endTime = Date.now()

    console.log("searched in:", (endTime - startTime) / 1000, "s"  )
    console.log( solutions.length, solutions )

    solutions = solutions.sort(function(a, b){
        return b.length - a.length;
    });

    return solutions

}

/*
  . C . M .
  P . L . R
  . N . T .
  D . V . S
  . E . D .

*/
var test5x5 = [
    // across
    [  [1, '?'],  [2, 'c'],  [3, '?'],  [4, 'm'],  [5, '?'] ],
    [  [6, 'p'],  [7, '?'],  [8, 'l'],  [9, '?'], [10, 'r'] ],
    [ [11, '?'], [12, 'n'], [13, '?'], [14, 't'], [15, '?'] ],
    [ [16, 'd'], [17, '?'], [18, 'v'], [19, '?'], [20, 's'] ],
    [ [21, '?'], [22, 'e'], [23, '?'], [16, 'd'], [24, '?'] ],
    // down
    [  [1, '?'],  [6, 'p'], [11, '?'], [16, 'd'], [25, '?'] ],
    [  [2, 'c'],  [7, '?'], [12, 'n'], [17, '?'], [22, 'e'] ],
    [  [3, '?'],  [8, 'l'], [13, '?'], [18, 'v'], [23, '?'] ],
    [  [4, 'm'],  [9, '?'], [14, 't'], [19, '?'], [16, 'd'] ],
    [  [5, '?'], [10, 'r'], [15, '?'], [20, 's'], [24, '?'] ]
]

/*

  . C . R .
  L . S . R
  . B . S .
  T . A . T
  . A . T .

*/
var test5x5B = [
    // across
    [  [1, '?'],  [2, 'c'],  [3, '?'],  [4, 'r'],  [5, '?'] ],
    [  [6, 'l'],  [7, '?'],  [8, 's'],  [9, '?'], [4, 'r'] ],
    [ [11, '?'], [12, 'b'], [13, '?'],  [8, 's'], [15, '?'] ],
    [ [16, 't'], [17, '?'], [18, 'a'], [19, '?'], [20, 't'] ],
    [ [21, '?'], [18, 'a'], [23, '?'], [16, 't'], [24, '?'] ],
    // down
    [  [1, '?'],  [6, 'l'], [11, '?'], [16, 't'], [25, '?'] ],
    [  [2, 'c'],  [7, '?'], [12, 'b'], [17, '?'], [18, 'a'] ],
    [  [3, '?'],  [8, 's'], [13, '?'], [18, 'a'], [23, '?'] ],
    [  [4, 'r'],  [9, '?'], [ 8, 's'], [19, '?'], [16, 't'] ],
    [  [5, '?'], [10, 'r'], [15, '?'], [16, 't'], [24, '?'] ]
]


var startTime = Date.now()

// loaded dictionary words ..
var WORDS = []
var WORD_SET = {}
var WORDS_LEN = {}

function loadWords(rawData){
    var processed = []
    WORDS = rawData.split('\n')
    for(var i = 0; i < WORDS.length; ++i){
        var w = WORDS[i].replace(/[^a-zA-Z]/,"").toLowerCase()
        if(!WORD_SET[w]){
            WORD_SET[w] = w
            processed.push(w)
        }
        var lenSet = WORDS_LEN[w.length]
        if(!lenSet){
            lenSet = []
            WORDS_LEN[w.length] = lenSet
        }
        lenSet.push(w)
    }
    WORDS = processed

    var endTime = Date.now()

    console.log("loaded in:", (endTime - startTime) / 1000, "s"  )

}

$(function(){ $.get("./data/aspell-seldom-used.txt", loadWords); })
