<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
</head>
<body>
<?php
    //xdebug_info();
    print_r($_POST);
    print_r($_REQUEST);
    echo "Hi<br>";
    echo '<br>';
    echo "Hello<br>";
    echo "Hello";
    
    $fname = $_POST['fname'] ?? 'saleh';
    $lname = $_POST['lname'] ?? 'elgaberty';
?>
    <h1>
        Welcome <b><?php echo $fname.' '.$lname; ?></b>
    </h1>
<?php if(!isset($_POST['fname'])) { ?>
    <div>
        <form method="post" action="">
            <input type="text" placeholder="" name="fname">
            <input type="text" placeholder="" name="lname">
            <input type="submit" value="***update***">
        </form>
    </div>
<?php } ?>
</body>
</html>