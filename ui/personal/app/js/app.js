
Parse.initialize("GSokst4fADdbvRMl7ccJDUciSk29R14sjAsxUbaU", "OrPXlbWN042ssMXc2PvtXn91DZnHuCeSHH8pZvYR");

var levels = [
    {
        level: "Beginner",
        maxPoints: 250.0
    },
    {
        level: "Intermediate",
        maxPoints: 500.0
    }
];

function reloadLoginState() {

    if (Parse.User.current() == null)
    {
        $("#task-progress").hide();
        $("#sign-out-button").hide();
        $("#update-zip-button").hide();
    }
    else
    {
        $("#username-textbox").val(Parse.User.current().getUsername());
        $("#zipcode-textbox").val(Parse.User.current().get("location"));
        $("#login-error").html("");
        $("#sign-in-button").hide();
        $("#create-account-button").hide();
        $("#update-zip-button").show();
        $("#username-textbox").attr("readonly", "readonly");
        $("#password-textbox").hide();
        $("#not-logged-in").slideUp(function() {
            $("#task-progress").slideDown();
            $("#sign-out-button").show();
        });

        refreshPoints();
        refreshTodos();
    }
}

function refreshPoints() {

    Parse.User.current().fetch().then(function() {

        var points = Parse.User.current().get("points");
        if (points == null) points = 0.0;
        var currentLevel = 0;

        for (var i in levels) {
            currentLevel = i;
            if (points < levels[i].maxPoints) {
                break;
            }
        }

        $("#progress-bar-complete").animate({ width: (100.0 * points / levels[currentLevel].maxPoints) + "%" });
        $("#progress-bar span.caption").html(levels[currentLevel].level + " (" + points + "/" + levels[currentLevel].maxPoints + ")");
    });
}

function refreshTodos() {

   var relation = Parse.User.current().relation("challenges");
   var query = relation.query();
   query.notEqualTo("completed", true);

   query.find({
        success: function(todos) {
            
            $(".todo").remove();

            var template = $('#todo-template').html();
            Mustache.parse(template);

            for (var i in todos) {
                $("#task-progress").after($(Mustache.render(template, { title: todos[i].get("description"), points: todos[i].get("completedPoints"), id: todos[i].id })));
            }

            $(".complete-task").click(function() {
                var id = $(this).data("task-id");
                $("#todo-" + id).slideUp();

                var Challenge = Parse.Object.extend("Challenge");
                var q = new Parse.Query(Challenge);
                
                q.get(id, {
                    success: function(todo) {
                        todo.set("completed", true);
                        Parse.User.current().set("points", (Parse.User.current().get("points") || 0) + todo.get("completedPoints"));
                        todo.save();
                        Parse.User.current().save().then(function() {
                            refreshPoints();
                        });
                    },
                    error: function(error) {
                         alert("Error: " + error.code + " " + error.message);
                    }                
                });

            });

        },
        error: function(error) {
           alert("Error: " + error.code + " " + error.message);
        }
   });

}

function performSearch() {

    if (Parse.User.current() == null || Parse.User.current().get("location") == null || Parse.User.current().get("location").length != 5)
    {
        performSearch("94802");
    }
    else
    {
        performSearch(Parse.User.current().get("location"));
    }
}

$(document).ready(loadPage);
window.addEventListener('push', function() { loadPage(); });

function loadPage() {

    $("#sign-in-button").click(function() {
        $("button").attr("disabled", "disabled");
        processLogin($("#username-textbox").val(), $("#password-textbox").val());
    });

    $("#update-zip-button").click(function() {
        Parse.User.current().set("location", $("#zipcode-textbox").val());
        Parse.User.current().save({ success: function() {
                alert("Zipcode Updated");
            }, function(data, error) {
                $("#zipcode-textbox").val(data.get("location"));
            }
        });
    });

    $("#create-account-button").click(function() {
        $("button").attr("disabled", "disabled");
        processLogin($("#username-textbox").val(), $("#password-textbox").val());

        Parse.User.signUp($("#username-textbox").val(), $("#password-textbox").val(), { ACL: new Parse.ACL(), "location": $("#zipcode-textbox").val() }, {
            success: function(user) {
                $("button").removeAttr("disabled");
                reloadLoginState();
            },
            error: function(user, error) {
                $("#login-error").html("Invalid username or password. Please try again (" + error.message + ").").show();
                $("button").removeAttr("disabled");i
            }
        });
    });

    $("#sign-out-button").click(function() {
        Parse.User.logOut().then(function() {
            window.location.reload(false);
        }).fail(function(error) {
            alert(JSON.stringify(error));
        });
    });

    if ($("#login-error").length > 0) {
        //alert("LOADING HOME");
        reloadLoginState();
    }
   
    if ($("#challenge-header").length > 0) {
        //alert("LOADING CHALLENGES");
        loadChallenges();
    }
}

function loadChallenges() {

    var ExampleChallenge = Parse.Object.extend("ExampleChallenge");
    var query = new Parse.Query(ExampleChallenge);

    query.find({
        success: function(examples) {

            var template = $('#challenge-template').html();
            Mustache.parse(template);

            for (var i in examples) {
                $("#challenge-header").after($(Mustache.render(template, { description: examples[i].get("description"), points: examples[i].get("completedPoints"), id: examples[i].id })));
            }

            $(".add-challenge").click(function() {
                var id = $(this).data("id");
                var q = new Parse.Query(ExampleChallenge);
                q.get(id, {
                    success: function(example) {

                        var Challenge = Parse.Object.extend("Challenge");
                        var newChallenge = new Challenge();
                        newChallenge.set("description", example.get("description"));
                        newChallenge.set("completedPoints", example.get("completedPoints"));
                        newChallenge.save().then(function(savedChallenge) {

                            Parse.User.current().relation("challenges").add(savedChallenge);
                            Parse.User.current().save().then(function() {
                                PUSH({ url: "index.html",  transition: "slide-out" });
                            });
                        });
                    }
                });
            });
        }
    });
}

function processLogin(username, password) {

    Parse.User.logIn(username, password, {
        success: function(user) {
            $("button").removeAttr("disabled");
            reloadLoginState();
        },
        error: function(user, error) {
            $("#login-error").html("Invalid username or password. Please try again (" + error.message + ").").show();
            $("button").removeAttr("disabled");
        }
    });
}

