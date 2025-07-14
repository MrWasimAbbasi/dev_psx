# psx-dockerize

This repository is created to run PSX application within a pre-configured dockerized environment.

To make the repository work for you follow the steps in this guide **IN ORDER, do not skip steps!**.

## Table of Contents

1. [Configure](#configure)
    1. [.env file for docker](#env-for-docker)
    1. [docker-compose.override.yml](#docker-composeoverrideyml)
1. [Get the application code](#get-the-application-code)
1. [Configure PSX CRM Laravel application (.env file)](#configure-the-application)
    1. [APP_URL](#app_url)
    1. [MySQL](#mysql)
    1. [Mongo](#mongo)
    1. [Redis](#redis)
    1. [Create Framework folders](#create-framework-folders)
1. [Starting the application](#run)
    1. [Database and users setup](#local-setup)
1. [XDebug](#xdebug)
    1. [Docer configuration](#docker-env)
    1. [VSCode configuration](#visual-studio-code)
        1. [WSL](#wsl)
    1. [Troubleshooting](#troubleshooting) 
1. [Minio for local S3 replacement](#minio-as-s3-replacement)
    1. [Configuration within Minio to get required credentials](#configuration-within-minio-to-get-required-credentials)
        1. [Configure region](#configure-region)
        1. [Create bucket](#create-bucket)
        1. [Create user with a service account](#create-user-with-a-service-account)
    1. [Modifications to Laravel .env file](#modifications-to-laravel-env-file)
    1. [Check laravel filesystems configuration](#check-laravel-filesystems-configuration)
    1. [Testing Minio integration](#testing-minio-integration)
1. [Websocket](#websocket)
    1. [Define websocket port for socket.io service](#define-websocket-port-for-socketio-service)
    1. [Setup the PSX application to know to use this service](#setup-the-psx-application-to-know-to-use-this-service)
        1. [PUSH_URL](#push_url)
        1. [BROADCAST_DRIVER](#broadcast_driver)
1. [Running API on local](#running-api-on-local)

## Configure
### .env for Docker
To set all the values that dockerized environment needs to be ran you need to configure variables 
outlined in the `.env.example` file. Easiest way is to copy `.env.example` to `.env` and make the updates within.

**DO not start** the docker environment before setting all the variables in the file.

### docker-compose.override.yml

In order to expose different services of the application to your local environment please make a copy of `docker-compose.override-example.yml` to `docker-compose.override.yml` and update the port values to desired values. Following the logic of
```yml
  ports:
    - "portOnLocalhost:portOfServiceInDocker"
    - "8000:80" #example for apache web server service - localhost:8000 would be directed to apache on port 80 inside docker
```

## Get the application code

Clone the source code of PSX application https://dev.azure.com/PSXDigital/PSX%20Development/_git/PSX from Azure Devops to `./src` folder in this project (extracted from the archive above).

**This may be problematic in some instances for Linux**. Best way to make sure you get a correctly functional setup for git is follow this procedure:

1. Create a following relative folder structure (or similar, but concept matters):
```bash
some_parent_folder/
├── psx-dockerize
|   ├── pdftk/
|   ├── php/
|   ├── websocket/
|   ├── .env.example
|   ├── .gitignore
|   ├── ... #rest of the files
├── psx-src #just an empty directory that is outside psx-dockerize folder  
```
2. Then git clone the PSX repository linked above into psx-src folder
2. Once you have the repository cloned move `psx-src` if you cloned repository directly into that folder, or folder called `PSX` within that folder into `psx-dockerize` folder
2. Rename the folder inside psx-dockerize to be called `src` (from psx-src or PSX)
2. Your resulting folder structure should be like this:
```bash
some_parent_folder/
├── psx-dockerize
|   ├── pdftk/
|   ├── php/
|   ├── websocket/
|   ├── src/  
|   |   ├── app/
|   |   ├── bootstrap/
|   |   ├── config/
|   |   ...
```

To make sure your folders have been set up correctly run the following commands:
```bash
$ cd psx-dockerize #navigate to psx-dockerize folder
$ git remote get-url orign
# This is the expected outcome, if set up from GitLab repository - if you did not use ssh to clone the repository, the url may be a bit different but should still reference git.scr.ee
git@git.scr.ee:psx/psx-dockerize.git
# OR
# The expected result if you set up the psx-dockerize from an archive file (zip)
fatal: not a git repository (or any of the parent directories): .git 

$ cd scr # Within the psx-dockerize folder
$ git remote get-url origin
# Expected outcome for the psx repository folder.
# If you cloned using HTTPS not ssh, the url may be slightly different, but still referencing dev.azure.com
git@ssh.dev.azure.com:v3/PSXDigital/PSX%20Development/PSX 

```
If you are seeing or getting different results than described above something has gone wrong and you may need to re-do the getting psx code step.

## Configure the application

Copy the `./src/env.example` file to `./src/.env`.

Inside that file following changes are required to be made.

### APP_URL

Make sure `APP_URL` variable inside .env file matches your docker environment setup.
In case of default value of running the application on port 8000 the value in `.env` should be:
```
APP_URL="http://localhost:8000/"
```
**Make sure you have the trailing /, otherwise the website will not work properly. You'll be getting weird errors of invalid URL.**

### MySql

Lines 47-50

```
DB_HOST=database
DB_DATABASE="Value of MYSQL_DATABASE in the ./.env file for dockerization"
DB_USERNAME="Value of MYSQL_USER in the ./.env file for dockerization"
DB_PASSWORD="Value of MYSQL_PASSWORD in the ./.env file for dockerization"
```

### Mongo

Lines 53-557

```
MONGO_DB_HOST=mongo
MONGO_DB_PORT=27017
MONGO_DB_DATABASE=psx_data
MONGO_DB_USERNAME="Value of MONGO_INITDB_ROOT_USERNAME from the ./.env file"
MONGO_DB_PASSWORD="Value of MONGO_INITDB_ROOT_PASSWORD from the ./.env file"
MONGO_DB_AUTHDB=admin #this may be missing in the example .env file for psx repo
```
**Special note! `MONGO_DB_AUTHDB` may not be present in the example env file. Be sure to add it**

### Redis

Lines 84-84

```
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
```

### Create Framework folders

In order for the application to run properly you mayalso need to create some folders inside the `src/storage`.
You need to have following folders:
```bash
./src/storage/app
./src/storage/framework
./src/storage/framework/cache
./src/storage/framework/sessions
./src/storage/framework/views
./src/storage/logs
```
In some instances you may need to also set permissions on those folders such that the web server inside docker is allowed to write into those folders.
To do so you can use this command for example:
```bash
$ chmod -R 0777 ./src/storage/framework # or replace the last part with another subfolder
```

### Other changes
Rest of the changes are not mandatory to get the core functionality running. To work on specific functionalities within the application it may be necessary to set other environment variables as well.

## Run

Start docker

**Note** you would need to do `docker login https://registry.scr.ee` if you have not done already (use you gitlab credentials when prompted)

```bash
docker-compose up -d
```

Gulp build

Add following in src/gulpfile.js  line 42-43

```
mix.copy('./resources/assets/public/*.htaccess', 'public');
mix.copy('./resources/assets/public/index.php', 'public/index.php');
```

Run following commands in order

```bash
$ docker-compose exec laravel bash
# should open up a bash shell
$ composer install
$ npm i
$ gulp
$ php artisan key:generate
$ exit
```


Open the application via the browser http://localhost:8000 (or what ever port defined via `docker-compose.override.yml` file)

### Local setup
- Import/run dump file psx_empty_dump.sql in psx db to get structure and initial data
  - After you pull in the dump, log into your MySQL db, using preferred tool to see if the migrations table is populated with data up to migration `2021_09_27_121802_create_deletion_logs_collection` if not, you'll have hard time getting things running. If you don't see the migrations listed there - suggestion is to (drop the database and) re-import the dump file.
- To run rest of the migrations that have been added since you need to run following commands in order
  - `$ docker-compose exec laravel bash`
  - `php artisan migrate`
  - `exit`
- On login page (http://localhost:8000) reset password for madis@scr.ee then check laravel.log file for password reset link
- Reset password and login
- From top right user dropdown go to Administrative Options > Add Dealership
- Create a dealership
- Go to Add User
- Create a user and assign it to dealership you created
- Now you can login using new user you created

Generate Laravel Application Key
```bash
$ docker-compose exec laravel php artisan key:generate
```

Open the application via the browser http://localhost:8000 (or what ever port defined via `docker-compose.override.yml` file)

## Xdebug

### Docker env
Do to in-code debugging without having to do all the var_dump etc there is xdebug set up in the docker image.

In order to take advantage of this you need to make one change locally in `php/xdebug.ini` on the line `xdebug.client_host=192.168.1.100` set the ip address of your machine in local network (For WSL you will need IP address of virtual machine `xdebug.client_host=172.26.18.139`).

Next you need to add couple of items into `docker-compose.override.yml` in order to map the xdebug configuration to the docker image. See the sample file and `volumes` part, add to your local docker-compose.override.yml file. *If you make changes in docker-compose override file, do not forget to restart the docker containers ads the changes do not get applied otherwise.*

### Visual Studio Code

First you need to install [PHP Debug](https://marketplace.visualstudio.com/items?itemName=felixfbecker.php-debug) extension to VS Code.

Once it is installed you need to create/update the `launch.json` file for the debugger. **THIS is in the VSCode instance where the PSX source code is, not the dockerize project!!** You can do this by going to Run & Debug menu in VSCode and click `create a launch.json file` link. This will open a default launch configuration. However this will need to be updated a bit, as the path mappings need to be set for the breakpoints to work. Update the `Listen for Xdebug` configuration to be something like this, but matching your local setup paths:

```json
{
  "name": "Listen for Xdebug",
  "type": "php",
  "request": "launch",
  "port": 9003,
  "log": true, // can set to false, if set to true you can see the data in the debug console as well as the debug panel.
  "externalConsole": false,
  "pathMappings": {
    "/var/www/html": "/path/to/source/in/local/machine"
  }
},
```

#### WSL
IF you are using WSL you will have to add extra param in `launch.json` [Xdebug with vscode WSL](https://addshore.com/2021/02/vscode-php-xdebug-from-localhost-wsl2-and-docker-containers/)
```json
{
  ....
  "hostname": "0.0.0.0",
},
```

If this is set and your docker container is running, once you run "Listen for Xdebug" from `Run and Debug` you are able to set breakpoints and once the code reaches that point during execution inside docker, the execution will stop and you should be able to see the Variables, call stack etc in the debug panel.

### Troubleshooting

If you are unable to get the debug panel to show data, start by creating a php file inside the `src/public` folder that contains 
```php
<?php
xdebug_info();
exit;
```

then point your browser to that file. You should see Xdebug info. There is a block with Diagnostic Log. If your debugger is not able to connect then there will be Messages in that log. If the debugger is connected then the messages sections should be empty. Samle image of it can be seen on this [page](https://matthewsetter.com/setup-step-debugging-php-xdebug3-docker/) in the segment `How to Troubleshoot Xdebug if it doesn’t work`. If your info looks like on the image there, then the debugger cannot connect to VSCode, then most likely the IP that is set in the cdebug.ini is not accessible by xdebug from the container. If the messages block is empty but break points are not working your ``pathMappings` in the `launch.json` need to be revised.

## Minio as S3 replacement

As a precondition your dockerized environment would need to be set up and configured and functional. If the dockerized environment is not currently running you need to start it.

```bash
$ docker-compose up -d
```

If it is already running, you need to restart the dockerized env:
```bash
$ docker-compose down
$ docker-compose up -d
```

### Configuration within Minio to get required credentials

Minio cannot be configured just via docker-compose and hence some manual setup is required after dockerized env is started.

Default link for accessing Minio admin is [localhost:9001](http://localhost:9001). If you changed the port 9001 to something else in docker-compose.override.yml, use that port.

Opening that link should present a login screen to you. Enter the values from `.env` variables `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` into the username and password fields. Then log in. You should be taken to empty buckets list.

#### Configure region
For our application to be able to properly connect to Minio we need to configure a region for it. To do that navigate to `Congfiguration` page - menu on the left of the page. On the configuration page `Region` should be default section that is shown. In the form on the right fill the `Server Location` with a "region" value - for example `psx-local`. This value will be later used as a `S3_REGION` for Laravel configuration file. Once you save Minio will propmt you to restart in order for the Server Location to take effect. There should be a button on the notification to trigger that restart.

**Remember the value of the Server Location as you will need this for Laravel `.env` file.**
#### Create bucket
Next up we create a bucket. To do so select Buckets from the left menu. On the page that opens click `Create Bucket +` button. On create bucket page we only need to set the name for the bucket and click Create Bucket. Underscores (`_`) are not allowed in the bucket name!

**Remember the bucket name for usage in Laravel `.env` file**

#### Create user with a service account
Last we need to create an user and add a service account to them so we get the API key and Secret to use with Laravel.

In the left menu click `Identity` and then `Users`. On the page that opens click `Create user +`. You can set what ever username and password you like (these can be used to log into the same Minio admin panel later on if you like), these will not be used by PSX application. You can select all policies for the user created, but `readWrite` must be selected as a minimum. Click `Save` to create the user. You'll be taken back to users list, click on the newly created user. A user information page should open up, select `Service Accounts` from the menu that contains Groups, Service Accounts, Policies - for given user. Then on the page that opens click `Create service account+`. On the service account create page you do not need to do anything, just click create. A modal will open with your API key and secret. **Copy the values for usage in Laravel `.env` file!'**

### Modifications to Laravel .env file

Lines 92-95
You need to use values accquire above while configuring Minio.
```
S3_KEY="Value of the Service Account Key"
S3_SECRET="Value of the Service Account secret"
S3_REGION="Value of the Server Location configured in Minio"
S3_BUCKET="Name of the bucket you created in Minio"
```

Following lines may be missing in the example file, then you need to add those:
```
S3_ENDPOINT="http://minio:9000"
S3_PATH_STYLE_ENDPOINT=true
```

### Check laravel filesystems configuration

If the lines above were missing in the `env.example` file you probably also need to modify `config/filesystems.php` file still. In the configurations file block `disks` find configuration for `s3`. In that configuration block add following lines if not yet present such that the configuration block looks like this:
```php
's3'            => [
  'driver'    => 's3',
  'key'       => env('S3_KEY'),
  'secret'    => env('S3_SECRET'),
  'region'    => env('S3_REGION'),
  'bucket'    => env('S3_BUCKET'),
  'endpoint'  => env('S3_ENDPOINT'),
  'use_path_style_endpoint' => env('S3_PATH_STYLE_ENDPOINT'),
],
```

### Testing Minio integration

Once your dockerized environment is up, you can now test if Minio integration works by running following commands:
```bash
$ docker-compose exec laravel bash
$ php artisan tinker
```

Laravel Tinker should start. Within there you can run following commans to list files in the configured bucket, create a test file, see that it exists and then delete it by running these commands:
```php
>>> Storage::disk('s3')->allFiles('');
=> [] //expected result if bucket is empty

>>> Storage::disk('s3')->put('hello.json', '{"hello": "world"}');
=> true //expected result if file creation succeeded

>>> Storage::disk('s3')->allFiles('');
=> [
  "hello.json",
] // Expected result if our test file is only file in the bucket

>>> Storage::disk('s3')->delete('hello.json');
=> true //Expected result if file was deleted

>>> Storage::disk('s3')->allFiles('');
=> [] //Expected result if there are no files left in the bucket
```

## Websocket

In order the application to fully function (or close to it) it also needs a websocket service. In this repo is attached a trimmed down version of the service that is used in production (stripped out firebase integration).

To make the websocket fully functional in a local environment there are couple of steps you need to take.

### Define websocket port for socket.io service

This will be done via `docker-compose.override.yml` file. See the example file for what should be added. Default port for it is `3000` at the moment. If you wish to change said port, do so via `docker-compose.override.yml` file.

```yaml
...
ports:
  - "3333:3000"
...
```

### Setup the PSX application to know to use this service

For PSX laravel application 2 changes are required to use this local socket.io service now. Change/add the following items in the `.env` for tha Laravel project.

#### PUSH_URL
```env
#PUSH_URL=http://host:port
# Example for default
PUSH_URL= http://localhost:3000
```

**NB!** You may need to use your local network ip, rather than localhost. This depends on your setup.

#### BROADCAST_DRIVER

```env
BROADCAST_DRIVER=redis
```

#### Generate JWT_SECRET
Generate a JWT_SECRET for websocket authorization

```
php artisan jwt:secret
```
This will update your .env file with something like JWT_SECRET=foobar

#### Update websocket service to use the JWT_SECRET

In `./websocket/src/` folder is `env.example` file. Copy it to `./websocket/src/.env` and as a value of `JWT_SECRET` set the value that was generated by the artisan command in the previous step into Laravels `.env` file.

You will also need to rebuild and restart your dockerized env by running:
```bash
$ docker-compose down
$ docker-compose up -d --build
```
This ensures the new configuration is properly attached for the websocket service.

## Running API on local

run 
`docker-compose exec laravel php artisan key:generate`
and then
`run php artisan passport:install`

One successfull you will see output something like 

```bash
Personal access client created successfully.
Client ID: 1
Client Secret: secret_key
Password grant client created successfully.
Client ID: 2
Client Secret: secret_key
```

Copy client id and secerte under `Password grant` to `/src/.env` `OAUTH_CLIENT_ID` and `OAUTH_SECRET`

Now you should be able to use API using POSTMAN or any similar tools.

You can find API end points details on Azure https://dev.azure.com/PSXDigital/PSX%20Development/_wiki/wikis/PSX-Development.wiki/52/API-Collection

**Note** 
You would have to use your IP for that
Set 
APP_URL=http://{your_ip}:8000/

HTTPS_COOKIES=false

SESSION_DRIVER=database (If you don't have session table in laravel run `php artisan session:table` and `php artisan migrate`
