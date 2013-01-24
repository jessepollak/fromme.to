require 'sinatra'

get '/' do
    erb :index
end

get '/:destination' do |destination|
    @destination = destination
    erb :search
end