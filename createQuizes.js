const webdriver = require('selenium-webdriver');
const Papaparse = require('papaparse');
const fs = require('fs');
var replace = require("replace");

const browser = new webdriver.Builder().withCapabilities(webdriver.Capabilities.firefox()).build();

const DOMAIN = 'http://campus.acai-la.org';
const COURSE_ID = '102';
const QUIZ_ID = '1287,17514';
const USERNAME = '';
const PASSWORD = '';
const QUESTIONS_PATH = './data/example.csv';
const ANSWERS = {
    'a': 0,
    'b': 1,
    'c': 2,
    'd': 3,
    'e': 4
}

let questions = [];

const index = () => {
    browser.get(DOMAIN);

    browser.getTitle()
    .then(function(title) {
        login();
    })
}

const login = () => {
    const usernameBox = browser.wait(webdriver.until.elementLocated(webdriver.By.id("username")));
    usernameBox.then(() => {
        usernameBox.sendKeys(USERNAME);

        const passwordBox = browser.wait(webdriver.until.elementLocated(webdriver.By.id("password")));
        passwordBox.then(() => {
            passwordBox.sendKeys(PASSWORD);
            const submitButton = browser.wait(webdriver.until.elementLocated(webdriver.By.id("loginbtn")));
            submitButton.click()
            .then(() => {
                sleep(2000).then(() => {
                    goCourseHome();
                })
            })
        })
    })

}

async function goCourseHome() {
    browser.get(DOMAIN + '/course/view.php?id=' + COURSE_ID);

    await browser.getTitle()
    .then(function(title) {
        browser.get(DOMAIN + '/question/edit.php?courseid=' + COURSE_ID);

        createQuestions();
    })
}

async function createQuestions() {
    if ( questions ) {
        for (const question of questions) {
            console.log("---------------------------------------");
            console.log("[CREATING QUESTION] " + question.number);
            console.log(' ');
            const categorySelector = browser.wait(webdriver.until.elementLocated(webdriver.By.css(".choosecategory select option[value='"+QUIZ_ID+"']")));
            categorySelector.click();

            const newQuestionButton = browser.wait(webdriver.until.elementLocated(webdriver.By.css(".createnewquestion input")));
            newQuestionButton.click();
            
            const questionTypeSelector = browser.wait(webdriver.until.elementLocated(webdriver.By.id(question.qtype)));
            questionTypeSelector.click();

            const createQuestionSubmit = browser.wait(webdriver.until.elementLocated(webdriver.By.id("chooseqtype_submit")));
            createQuestionSubmit.click();

            await fillQuestionData(question);
        }
    } else {
        console.log('There are not questions.');
    }
}

async function fillQuestionData(question) {
    let scoreSelector;
    let answerText;
    let correctOption;
    
    const questionNumber = browser.wait(webdriver.until.elementLocated(webdriver.By.id("id_name")));
    questionNumber.sendKeys(question.number);
    questionNumber.sendKeys(webdriver.Key.TAB);
    questionNumber.sendKeys(webdriver.Key.TAB);

    const questionText = browser.switchTo().activeElement();
    await questionText.sendKeys(question.question);

    const answers = getAnswers(question);

    if ( question.qtype == 'qtype_multichoice' ) {
        // fill answers
        for (const [key, answer] of answers) {
            scoreSelector = browser.wait(webdriver.until.elementLocated(webdriver.By.id("id_fraction_" + ANSWERS[key])));
            browser.executeScript("arguments[0].scrollIntoView();", scoreSelector);
    
            if ( question.correct.includes(key) ) {
                correctOption = scoreSelector.findElement(webdriver.By.css("option[value='1.0']"));
                await correctOption.click();
            }
    
            await sleep(1000).then(async () => {
                scoreSelector.sendKeys(webdriver.Key.SHIFT + webdriver.Key.TAB)
                await sleep(1000).then(async () => {
                    answerText = await browser.switchTo().activeElement()
                    .then((answerText) => {
                        answerText.sendKeys(answer);
                        console.log('answer ' + ANSWERS[key] + ' inserted');
                        console.log(' ');
                    })
                })
            })
        }
    } else if ( question.qtype == 'qtype_truefalse' ) {
        scoreSelector = browser.wait(webdriver.until.elementLocated(webdriver.By.id("id_correctanswer")));
        browser.executeScript("arguments[0].scrollIntoView();", scoreSelector);

        if ( question.correct == 'v' ) {
            correctOption = scoreSelector.findElement(webdriver.By.css("option[value='1']"));
            await correctOption.click();
        } else if ( question.correct == 'f' ) {
            correctOption = scoreSelector.findElement(webdriver.By.css("option[value='0']"));
            await correctOption.click();
        }
    }
    
    // save question
    const saveQuestionButton = browser.wait(webdriver.until.elementLocated(webdriver.By.id("id_submitbutton")));
    console.log("[QUESTION CREATED] " + question.number);
    console.log("---------------------------------------");
    await saveQuestionButton.click();
}

async function getQuestionsData() {
    const questionsFile = await fs.createReadStream(QUESTIONS_PATH);

    Papaparse.parse(questionsFile, {
        header: true,
        complete: function( rows ) {
            questions = rows.data;
            console.log('---------------------------------');
            console.log('[QUESTIONS FETCHED SUCCESFULLY]')
            console.log('---------------------------------');
            // Object.values(questions.data).forEach(question => {
            //     console.log(question)
            // });
        }
    })
}

function getAnswers(question) {
    const answers = Object.entries(question).slice(4);
    return answers;
}

async function sleep(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

getQuestionsData();
index();